import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  type OnApplicationShutdown,
} from '@nestjs/common';
import {Cron} from '@nestjs/schedule';
import {randomUUID} from 'node:crypto';
import {PreparedStockRepository} from '../intelligence/repositories/prepared-stock.repository';
import {runWorkers} from '../sec-research/sec-processing';
import {buildReport, reportFingerprint} from './report-builder';
import {ReportRepository} from './report.repository';
import {
  REPORT_VERSION,
  type ReportCheckpoint,
  type ReportJob,
  type ReportResponse,
} from './report.types';

@Injectable()
export class ReportService implements OnApplicationShutdown {
  private readonly logger = new Logger(ReportService.name);
  private currentJob: Promise<void> | null = null;
  private closing = false;

  constructor(
    private readonly repository: ReportRepository,
    private readonly prepared: PreparedStockRepository,
  ) {}

  async start(): Promise<ReportJob> {
    if (this.closing) throw new ConflictException('Server is shutting down. Retry after restart.');
    if (this.currentJob)
      throw new ConflictException('A report job is already running. Check reports/status.');
    const sourceRunId = await this.repository.activeRun();
    const runId = `${sourceRunId}-reports-v${REPORT_VERSION}`;
    const owner = randomUUID();
    if (!(await this.repository.acquire(owner, runId))) {
      throw new ConflictException(
        'Another server owns the report job. Check reports/status; an interrupted worker’s lease expires after five minutes.',
      );
    }
    try {
      const universe = await this.prepared.getUniverse(sourceRunId);
      if (!universe?.length)
        throw new Error('The existing frozen stock universe is missing or empty.');
      const now = new Date().toISOString();
      const job: ReportJob = {
        runId,
        sourceRunId,
        version: REPORT_VERSION,
        status: 'running',
        total: universe.length,
        processed: 0,
        generated: 0,
        unchanged: 0,
        limited: 0,
        failed: 0,
        activeSymbols: [],
        startedAt: now,
        updatedAt: now,
        completedAt: null,
        error: null,
      };
      await this.repository.saveJob(job, owner);
      const accepted = structuredClone(job);
      this.currentJob = this.run(job, universe, owner)
        .catch((error: unknown) =>
          this.logger.error(error instanceof Error ? error.message : String(error)),
        )
        .finally(() => {
          this.currentJob = null;
        });
      return accepted;
    } catch (error) {
      await this.repository.release(owner);
      throw error;
    }
  }

  private async run(
    job: ReportJob,
    universe: {symbol: string; companyName: string}[],
    owner: string,
  ): Promise<void> {
    let leaseFailure: unknown;
    let renewal: Promise<void> | null = null;
    const renew = () => {
      renewal ??= this.repository
        .renew(owner)
        .catch((error: unknown) => {
          leaseFailure = error;
        })
        .finally(() => {
          renewal = null;
        });
      return renewal;
    };
    const timer = setInterval(() => {
      void renew();
    }, 30000);
    timer.unref();
    const active = new Set<string>();
    let progress = Promise.resolve();
    const saveProgress = () => {
      const snapshot = {...job, activeSymbols: [...active], updatedAt: new Date().toISOString()};
      progress = progress.then(() => this.repository.saveJob(snapshot, owner));
      return progress;
    };
    try {
      await runWorkers(universe, 3, async (member) => {
        if (leaseFailure) throw leaseFailure;
        if (this.closing)
          throw new Error('Server stopped accepting report work; resume after restart.');
        active.add(member.symbol);
        let checkpoint: ReportCheckpoint;
        let report = null;
        try {
          const [input, saved] = await Promise.all([
            this.repository.readInput(job.sourceRunId, member.symbol, member.companyName),
            this.repository.readReport(member.symbol),
          ]);
          const fingerprint = reportFingerprint(input);
          const unchanged = saved?.version === REPORT_VERSION && saved.fingerprint === fingerprint;
          report = unchanged ? null : buildReport(input);
          checkpoint = {
            symbol: member.symbol,
            fingerprint,
            status: unchanged ? 'unchanged' : 'generated',
            coverage: (report ?? saved)!.status,
            checkedAt: new Date().toISOString(),
            error: null,
          };
        } catch (error) {
          checkpoint = {
            symbol: member.symbol,
            fingerprint: null,
            status: 'failed',
            coverage: null,
            checkedAt: new Date().toISOString(),
            error: (error instanceof Error ? error.message : String(error)).slice(0, 500),
          };
          this.logger.warn(`Report ${member.symbol}: ${checkpoint.error}`);
        }
        if (leaseFailure) throw leaseFailure;
        await this.repository.publish(job.runId, checkpoint, report, owner);
        job.processed++;
        if (checkpoint.status === 'generated') job.generated++;
        if (checkpoint.status === 'unchanged') job.unchanged++;
        if (checkpoint.status === 'failed') job.failed++;
        if (checkpoint.coverage === 'limited') job.limited++;
        active.delete(member.symbol);
        await saveProgress();
        this.logger.log(
          `Report ${member.symbol}: ${checkpoint.status}; ${job.processed}/${job.total}.`,
        );
      });
      job.status = job.failed ? 'partial' : 'complete';
      job.completedAt = new Date().toISOString();
      job.activeSymbols = [];
      job.updatedAt = job.completedAt;
      await this.repository.saveJob(job, owner);
    } catch (error) {
      job.status = 'interrupted';
      job.activeSymbols = [];
      job.updatedAt = new Date().toISOString();
      job.error = (error instanceof Error ? error.message : String(error)).slice(0, 500);
      await this.repository.saveJob(job, owner).catch(() => undefined);
      throw error;
    } finally {
      clearInterval(timer);
      await renewal;
      await this.repository.release(owner);
    }
  }

  status() {
    return this.repository.status();
  }

  async get(rawSymbol: string): Promise<ReportResponse> {
    const symbol = rawSymbol.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9.^-]{0,19}$/.test(symbol))
      throw new BadRequestException('Invalid stock symbol.');
    const report = await this.repository.readReport(symbol);
    if (!report) return {symbol, status: 'not_prepared', stale: false, report: null};
    const [activeRun, secRevision] = await Promise.all([
      this.repository.activeRun(),
      this.repository.currentSecRevision(symbol),
    ]);
    const financialAge = report.financialAsOf
      ? Date.now() - Date.parse(report.financialAsOf)
      : Infinity;
    return {
      symbol,
      status: 'ready',
      report,
      stale:
        report.version !== REPORT_VERSION ||
        report.sourceRunId !== activeRun ||
        report.secRevision !== secRevision ||
        financialAge > 8 * 86400000,
    };
  }

  @Cron('0 1 * * *', {timeZone: 'UTC'})
  async refreshSavedReports(): Promise<void> {
    try {
      await this.start();
      await this.waitForCurrentJob();
    } catch (error) {
      this.logger.warn(
        `Scheduled reports: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async waitForCurrentJob(): Promise<void> {
    await this.currentJob;
  }

  async onApplicationShutdown(): Promise<void> {
    this.closing = true;
    await this.waitForCurrentJob();
  }
}
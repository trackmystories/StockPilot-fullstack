import {ConflictException, Injectable, Logger} from '@nestjs/common';
import {focusFilings, researchMode, runWorkers, workerCount} from './sec-processing';
import {randomUUID} from 'node:crypto';
import {PreparedStockRepository} from '../intelligence/repositories/prepared-stock.repository';
import {SecAccessError, SecCacheService} from './sec-cache.service';
import {resolveCik} from './sec-extractor';
import {SecIngestionService} from './sec-ingestion.service';
import {SecResearchRepository} from './sec-research.repository';
import {
  emptyLayers,
  EXTRACTOR_VERSION,
  hash,
  LAYER_NAMES,
  type Checkpoint,
  type ResearchRun,
} from './sec-research.types';

@Injectable()
export class SecResearchService {
  private readonly logger = new Logger(SecResearchService.name);

  constructor(
    private readonly prepared: PreparedStockRepository,
    private readonly repository: SecResearchRepository,
    private readonly cache: SecCacheService,
    private readonly ingestion: SecIngestionService,
  ) {}

  private jobId(financialRunId: string, cacheOnly = false): string {
    return `${financialRunId}-sec-v${EXTRACTOR_VERSION}-${researchMode()}-p2${cacheOnly ? '-salvage' : ''}`;
  }

  async status(): Promise<Record<string, unknown> | null> {
    const source = await this.repository.activeFinancialRun();
    const [online, salvage] = await Promise.all([
      this.repository.runState(this.jobId(source)),
      this.repository.runState(this.jobId(source, true)),
    ]);
    return {...online, salvage};
  }

  async salvage(): Promise<ResearchRun> {
    return this.cache.useCachedSources(() => this.refresh(undefined, true));
  }

  async refresh(financialRunId?: string, cacheOnly = false): Promise<ResearchRun> {
    this.cache.assertConfigured();
    const concurrency = workerCount();
    const sourceRunId = financialRunId ?? (await this.repository.activeFinancialRun());
    const runId = this.jobId(sourceRunId, cacheOnly);
    const owner = randomUUID();
    if (!(await this.repository.acquire(owner)))
      throw new ConflictException(
        'Another server owns the SEC research lease. Wait for its expiry or stop the other worker.',
      );
    let heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    let leaseFailure: unknown;
    let renewal: Promise<void> | null = null;
    const heartbeat = async () => {
      if (leaseFailure) throw leaseFailure;
      renewal ??= this.repository
        .renew(owner)
        .catch((error: unknown) => {
          leaseFailure = error;
          throw error;
        })
        .finally(() => {
          renewal = null;
        });
      await renewal;
    };
    heartbeatTimer = setInterval(() => {
      void heartbeat().catch(() => undefined);
    }, 30000);
    heartbeatTimer.unref();
    try {
      const universe = await this.prepared.getUniverse(sourceRunId);
      if (!universe?.length)
        throw new Error('The existing frozen stock universe is missing or empty.');
      const previous = await this.repository.runState(runId);
      if (previous?.status === 'complete' && Date.now() - Number(previous.completedAt) < 86400000) {
        return previous.result as ResearchRun;
      }
      const resumed =
        previous &&
        previous.status !== 'complete' &&
        typeof previous.startedAt === 'string' &&
        typeof previous.windowStart === 'string';
      const startedAt = resumed ? String(previous.startedAt) : new Date().toISOString();
      const lookbackDays = Number(process.env.SEC_RESEARCH_LOOKBACK_DAYS ?? 730);
      if (!Number.isInteger(lookbackDays) || lookbackDays < 365 || lookbackDays > 3650) {
        throw new Error('SEC_RESEARCH_LOOKBACK_DAYS must be between 365 and 3650.');
      }
      const windowStart = resumed
        ? String(previous.windowStart)
        : new Date(Date.now() - lookbackDays * 86400000).toISOString().slice(0, 10);
      await this.repository.saveRun(
        runId,
        {
          sourceRunId,
          status: 'running',
          startedAt,
          windowStart,
          total: universe.length,
          extractorVersion: EXTRACTOR_VERSION,
          error: null,
          selectionMode: researchMode(),
          cacheOnly,
          concurrency,
          processed: 0,
        },
        owner,
      );
      const tickers = await this.ingestion.tickers();
      const checkpoints = await this.repository.checkpoints(runId);
      let processed = universe.filter((member) => {
        const saved = checkpoints.get(member.symbol);
        return (
          saved && !['failed', 'partial'].includes(saved.status) && saved.checkedAt >= startedAt
        );
      }).length;
      const active = new Set<string>();
      let progressQueue = Promise.resolve();
      const saveProgress = () => {
        progressQueue = progressQueue.then(() =>
          this.repository.saveRun(
            runId,
            {
              processed,
              failed: [...checkpoints.values()].filter((row) => row.status === 'failed').length,
              partial: [...checkpoints.values()].filter((row) => row.status === 'partial').length,
              activeSymbols: [...active],
              updatedAt: new Date().toISOString(),
              ...this.cache.metrics,
            },
            owner,
          ),
        );
        return progressQueue;
      };
      await saveProgress();
      const issuers = new Map<string, Promise<'prepared' | 'partial' | 'unchanged'>>();
      await runWorkers(universe, concurrency, async (member) => {
        if (leaseFailure) throw leaseFailure;
        const saved = checkpoints.get(member.symbol);
        if (saved && !['failed', 'partial'].includes(saved.status) && saved.checkedAt >= startedAt)
          return;
        const companyStartedAt = Date.now();
        active.add(member.symbol);
        await saveProgress();
        this.logger.log(`SEC start: ${member.symbol}; ${processed}/${universe.length} processed.`);
        const cik = resolveCik(member.symbol, tickers);
        let status: Checkpoint['status'] = 'no_sec_match';
        let error: string | null = null;
        try {
          if (cik) {
            let work = issuers.get(cik);
            if (!work) {
              work = this.prepareCompany(cik, windowStart, owner, async () => {
                if (leaseFailure) throw leaseFailure;
              });
              issuers.set(cik, work);
            }
            status = await work;
          }
        } catch (cause) {
          if (cause instanceof SecAccessError) throw cause;
          status = 'failed';
          error = cause instanceof Error ? cause.message : String(cause);
          this.logger.warn(`${member.symbol}: ${error}`);
        }
        const checkpoint: Checkpoint = {
          symbol: member.symbol,
          cik,
          status,
          checkedAt: new Date().toISOString(),
          error,
        };
        await this.repository.checkpoint(runId, checkpoint, owner);
        checkpoints.set(member.symbol, checkpoint);
        processed++;
        active.delete(member.symbol);
        await saveProgress();
        this.logger.log(
          `SEC ${member.symbol}: ${status}; ${processed}/${universe.length}; ${Math.round((Date.now() - companyStartedAt) / 1000)}s.`,
        );
      });
      const values = universe.map((item) => checkpoints.get(item.symbol)!);
      const failed = values.filter((item) => item.status === 'failed').length;
      const partial = values.filter((item) => item.status === 'partial').length;
      const result: ResearchRun = {
        runId,
        status: failed || partial ? 'partial' : 'complete',
        total: universe.length,
        completed: values.length - failed - partial,
        partial,
        failed,
        noSecMatch: values.filter((item) => item.status === 'no_sec_match').length,
      };
      await this.repository.saveRun(runId, {...result, result, completedAt: Date.now()}, owner);
      return result;
    } catch (cause) {
      await this.repository
        .saveRun(
          runId,
          {
            status: 'partial',
            error: cause instanceof Error ? cause.message : String(cause),
          },
          owner,
        )
        .catch(() => undefined);
      throw cause;
    } finally {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      await (renewal as Promise<void> | null)?.catch(() => undefined);
      await this.repository.release(owner);
    }
  }

  private async prepareCompany(
    cik: string,
    windowStart: string,
    owner: string,
    heartbeat: () => Promise<void>,
  ): Promise<'prepared' | 'partial' | 'unchanged'> {
    const available = await this.ingestion.filings(cik, windowStart, heartbeat);
    const filings = researchMode() === 'focused' ? focusFilings(available) : available;
    const fingerprint = hash(
      JSON.stringify({version: EXTRACTOR_VERSION, policy: 2, mode: researchMode(), filings}),
    );
    const previous = await this.repository.company(cik);
    if (previous?.fingerprint === fingerprint && !previous.failedFilingCount) {
      await this.repository.publish(
        {...previous, windowStart, checkedAt: new Date().toISOString()},
        null,
        owner,
      );
      return 'unchanged';
    }
    const layers = emptyLayers();
    const warnings = new Set<string>();
    let documentCount = 0;
    let failedFilingCount = 0;
    for (const filing of filings) {
      await heartbeat();
      let results;
      try {
        results = await this.ingestion.extractFiling(cik, filing, heartbeat);
      } catch (error) {
        if (error instanceof SecAccessError) throw error;
        failedFilingCount++;
        warnings.add(
          `${filing.accession}: ${error instanceof Error ? error.message : String(error)}`,
        );
        this.logger.warn(`SEC ${cik} filing ${filing.accession} failed; retaining other filings.`);
        continue;
      }
      for (const result of results) {
        if (result.source) documentCount++;
        result.warnings.forEach((warning) => warnings.add(`${filing.accession}: ${warning}`));
        for (const name of LAYER_NAMES) {
          const incoming = result.layers[name];
          const layer = layers[name];
          layer.omittedEvidenceCount += incoming.omittedEvidenceCount;
          for (const item of incoming.evidence) {
            if (
              layer.evidence.length >= 60 ||
              Buffer.byteLength(JSON.stringify(layer)) + Buffer.byteLength(JSON.stringify(item)) >
                450000
            ) {
              layer.omittedEvidenceCount++;
            } else if (!layer.evidence.some((existing) => existing.id === item.id)) {
              layer.evidence.push(item);
              layer.status = 'evidence_available';
            }
          }
        }
      }
    }
    if (!filings.length)
      warnings.add('No supported filings found in the configured filing-date window.');
    if (failedFilingCount && !documentCount) {
      throw new Error('No filing documents completed; previous published evidence was retained.');
    }
    if (researchMode() === 'focused') {
      warnings.add(
        'Focused coverage: latest annual and quarterly filings plus up to six disclosures from the last 90 days; not a complete filing history.',
      );
    }
    await this.repository.publish(
      {
        cik,
        fingerprint,
        extractorVersion: EXTRACTOR_VERSION,
        preparedAt: new Date().toISOString(),
        checkedAt: new Date().toISOString(),
        windowStart,
        filingCount: filings.length - failedFilingCount,
        selectedFilingCount: filings.length,
        failedFilingCount,
        selectionMode: researchMode(),
        documentCount,
        coverage:
          warnings.size || LAYER_NAMES.some((name) => layers[name].omittedEvidenceCount > 0)
            ? 'partial'
            : LAYER_NAMES.some((name) => layers[name].evidence.length > 0)
              ? 'evidence_available'
              : 'no_evidence',
        omittedWarningCount: Math.max(0, warnings.size - 200),
        warnings: [...warnings].slice(0, 200),
      },
      layers,
      owner,
    );
    return failedFilingCount ? 'partial' : 'prepared';
  }

  async research(rawSymbol: string): Promise<Record<string, unknown>> {
    const symbol = rawSymbol.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9.^-]{0,19}$/.test(symbol)) throw new Error('Invalid stock symbol.');
    const [financialAnalysis, scorecard, secResearch] = await Promise.all([
      this.prepared.getAnalysis(symbol),
      this.prepared.getScorecard(symbol),
      this.repository.read(symbol),
    ]);
    return {
      symbol,
      financialAnalysis,
      scorecard,
      secResearch,
      policy:
        'Use only cited source excerpts. Management explanations are attributed. Missing evidence is not a claim.',
    };
  }
}

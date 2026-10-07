import {Injectable, Logger} from '@nestjs/common';
// import {Cron} from '@nestjs/schedule';
import {randomUUID} from 'node:crypto';
import {SecResearchService} from '../../sec-research/sec-research.service';
import type {ResearchRun} from '../../sec-research/sec-research.types';
import {CALCULATION_VERSION} from '../calculation-version';
import {intelligenceCalculators} from '../calculators/calculator.registry';
import {ScreenerRankingService} from '../pipeline/screener-ranking.service';
import {
  StockIntelligenceRunnerService,
  type RunnerResult,
} from '../pipeline/stock-intelligence-runner.service';
import {ScreenerResultsRepository} from '../repositories/screener-results.repository';

@Injectable()
export class WeeklyIntelligenceJob {
  private readonly logger = new Logger(WeeklyIntelligenceJob.name);
  private running = false;
  constructor(
    private readonly runner: StockIntelligenceRunnerService,
    private readonly rankingService: ScreenerRankingService,
    private readonly repository: ScreenerResultsRepository,
    private readonly secResearch: SecResearchService,
  ) {}
  // @Cron('0 3 1 * *', {timeZone: 'UTC'})
  // async runMonthly(): Promise<void> {
  //   await this.refresh();
  // }
  private async publish(runId: string, results: RunnerResult, owner: string): Promise<void> {
    await this.repository.assertCompleteCheckpoints(runId);

    for (const calculator of intelligenceCalculators) {
      await this.repository.renewLease(owner);
      const ranked = this.rankingService.rank(
        calculator.id,
        results.screeners[calculator.id] ?? [],
      );
      await this.repository.saveScreenerResults(runId, calculator.id, ranked);
    }

    await this.repository.renewLease(owner);
    await this.repository.completeRun(runId);
    await this.repository.assertRunCanServe(runId);
    await this.repository.activateRun(runId, owner);

    try {
      await this.repository.assertActiveRunHealthy(runId);
      await this.repository.markActiveRunHealthy(runId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const restoredRun = await this.repository.rollbackActiveRun(runId, owner, message);
      this.logger.error(`Activation health check failed for ${runId}; restored ${restoredRun}: ${message}`);
      throw new Error(`New intelligence generation failed its activation health check. Restored ${restoredRun}.`);
    }

    this.logger.log(
      `Activated ${runId}: ${results.snapshots.length} stocks, calculation version ${CALCULATION_VERSION}.`,
    );
  }
  async refresh(): Promise<{
    financialRunId: string;
    secResearch: ResearchRun | {status: 'failed'; message: string};
  }> {
    if (this.running) throw new Error('An intelligence operation is already running.');
    this.running = true;
    const owner = randomUUID();
    let leased = false;
    try {
      leased = await this.repository.acquireLease(owner);
      if (!leased) throw new Error('Another server owns the intelligence refresh lease.');
      let runId = await this.repository.getResumableRun();
      if (!runId) {
        runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${owner.slice(0, 8)}`;
        await this.repository.createRun(runId);
      }
      const results = await this.runner.run(runId, () => this.repository.renewLease(owner));
      await this.publish(runId, results, owner);
      // Financial outputs are already published; SEC research has its own lease and checkpoints.
      await this.repository.releaseLease(owner);
      leased = false;
      try {
        return {financialRunId: runId, secResearch: await this.secResearch.refresh(runId)};
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Financial results published; SEC research needs retry: ${message}`);
        return {financialRunId: runId, secResearch: {status: 'failed', message}};
      }
    } finally {
      this.running = false;
      if (leased) await this.repository.releaseLease(owner);
    }
  }
  async salvage(): Promise<{
    success: boolean;
    runId: string;
    salvagedStocks: number;
    screenersPublished: number;
  }> {
    if (this.running) throw new Error('An intelligence operation is already running.');
    this.running = true;
    const owner = randomUUID();
    let leased = false;
    try {
      leased = await this.repository.acquireLease(owner);
      if (!leased) throw new Error('Another server owns the intelligence refresh lease.');
      const runId = await this.repository.getResumableRun();
      if (!runId) throw new Error('No compatible unfinished run exists.');
      // Publishing a subset changes peer meaning and silently drops coverage: require the frozen universe.
      await this.repository.assertCompleteCheckpoints(runId);
      const checkpoints = await this.repository.getStockCheckpoints(runId);
      const screeners: RunnerResult['screeners'] = Object.fromEntries(
        intelligenceCalculators.map((calculator) => [calculator.id, []]),
      );
      for (const checkpoint of checkpoints)
        for (const calculator of intelligenceCalculators) {
          const result = checkpoint.calculations[calculator.id];
          if (!result || result.eligible === undefined)
            throw new Error('A calculator output is missing; resume the run.');
          screeners[calculator.id].push({symbol: checkpoint.symbol, ...result});
        }
      await this.publish(
        runId,
        {screeners, snapshots: checkpoints.map((item) => item.snapshot)},
        owner,
      );
      return {
        success: true,
        runId,
        salvagedStocks: checkpoints.length,
        screenersPublished: intelligenceCalculators.length,
      };
    } finally {
      this.running = false;
      if (leased) await this.repository.releaseLease(owner);
    }
  }
}
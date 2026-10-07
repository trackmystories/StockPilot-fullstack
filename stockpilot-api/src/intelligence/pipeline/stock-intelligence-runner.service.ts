import {Injectable, Logger} from '@nestjs/common';
import {FmpHttpService} from '../../fmp/clients/fmp-http.service';
import {FmpFinancialService} from '../../fmp/services/fmp-financial.service';
import {FmpIntelligenceDataService} from '../../fmp/services/fmp-intelligence-data.service';
import {FmpRiskDataService} from '../../fmp/services/fmp-risk-data.service';
import {FmpStockScreenerService} from '../../fmp/services/fmp-stock-screener.service';
import {FmpThesisDataService} from '../../fmp/services/fmp-thesis-data.service';
import {ANALYSIS_VERSION} from '../analysis-version';
import {buildPreparedAnalysis} from '../build-prepared-analysis';
import {calculateScorecard} from '../calculate-scorecard';
import {CALCULATION_VERSION} from '../calculation-version';
import {intelligenceCalculators} from '../calculators/calculator.registry';
import {attachEstimateRevisions} from '../calculators/estimates-rising.calculator';
import {calculateRiskScore} from '../calculators/risk.calculator';
import {buildPeerContexts} from '../peer-context';
import type {PreparedInput} from '../prepared-stock.type';
import {PreparedStockRepository} from '../repositories/prepared-stock.repository';
import {
  ScreenerResultsRepository,
  type CheckpointCalculation,
  type StockIntelligenceCheckpoint,
} from '../repositories/screener-results.repository';
import {
  buildScorecardMetrics,
  ordered,
} from '../scorecard-metrics';
import type {StockSnapshot} from '../types';
import type {CalculatedScreenerResult} from '../types/screener-result';

export type {CalculatedScreenerResult} from '../types/screener-result';

type Row = Record<string, unknown>;

export type RunnerResult = {
  screeners: Record<
    string,
    CalculatedScreenerResult[]
  >;
  snapshots: StockSnapshot[];
};

@Injectable()
export class StockIntelligenceRunnerService {
  private readonly logger = new Logger(
    StockIntelligenceRunnerService.name,
  );

  constructor(
    private readonly http: FmpHttpService,
    private readonly financialService: FmpFinancialService,
    private readonly intelligenceDataService: FmpIntelligenceDataService,
    private readonly riskDataService: FmpRiskDataService,
    private readonly stockScreenerService: FmpStockScreenerService,
    private readonly screenerResultsRepository: ScreenerResultsRepository,
    private readonly preparedStockRepository: PreparedStockRepository,
    private readonly thesis: FmpThesisDataService,
  ) {}

  async run(
    runId: string,
    heartbeat: () => Promise<void> = async () => {},
  ): Promise<RunnerResult> {
    const configuredLimit =
      process.env.INTELLIGENCE_STOCK_LIMIT?.trim();

    const stockLimit =
      configuredLimit
        ? Number(configuredLimit)
        : null;

    if (
      stockLimit !== null &&
      (!/^\d+$/.test(
        configuredLimit!,
      ) ||
        !Number.isSafeInteger(
          stockLimit,
        ) ||
        stockLimit < 1)
    ) {
      throw new Error(
        'INTELLIGENCE_STOCK_LIMIT must be a positive integer or unset.',
      );
    }

    let candidates =
      await this.preparedStockRepository.getUniverse(
        runId,
      );

    if (
      candidates &&
      stockLimit !== null &&
      candidates.length > stockLimit
    ) {
      throw new Error(
        `Run ${runId} contains ${candidates.length} stocks, exceeding INTELLIGENCE_STOCK_LIMIT=${stockLimit}.`,
      );
    }

    if (!candidates) {
      const fetched =
        await this.stockScreenerService.getCandidates();

      candidates = [
        ...new Map(
          fetched.map((candidate) => [
            candidate.symbol,
            candidate,
          ]),
        ).values(),
      ];

      if (stockLimit !== null) {
        candidates =
          candidates.slice(
            0,
            stockLimit,
          );
      }

      if (!candidates.length) {
        throw new Error(
          'Stock universe is empty.',
        );
      }

      await heartbeat();

      await this.preparedStockRepository.saveUniverse(
        runId,
        candidates,
      );
    }

    this.logger.log(
      `Processing frozen universe: ${candidates.length} stocks (limit: ${stockLimit ?? 'unlimited'}).`,
    );

    const inputs = new Map(
      (
        await this.preparedStockRepository.getInputs(
          runId,
        )
      ).map((input) => [
        input.symbol,
        input,
      ]),
    );

    const failures: string[] = [];

    // Stage 1: freeze each normalized input, including the revision baseline, before constructing peers.
    for (const candidate of candidates) {
      await heartbeat();

      if (
        inputs.has(candidate.symbol)
      ) {
        continue;
      }

      const symbol =
        candidate.symbol;

      try {
        const [
          financials,
          momentum,
          estimateData,
          risk,
          quote,
          profile,
          history,
          thesisData,
          previousEstimates,
        ] = await Promise.all([
          this.financialService.getFinancialStatements(
            symbol,
          ),
          this.intelligenceDataService.getMomentumData(
            symbol,
          ),
          this.intelligenceDataService.getEstimatesData(
            symbol,
          ),
          this.riskDataService.getStockRiskMetrics(
            symbol,
            true,
          ),
          this.http.get<Row[]>(
            'quote',
            {symbol},
          ),
          this.http.get<Row[]>(
            'profile',
            {symbol},
          ),
          this.http.get<Row[]>(
            'historical-price-eod/full',
            {symbol},
          ),
          this.thesis.getThesisData(
            symbol,
          ),
          this.preparedStockRepository.getPreviousEstimates(
            symbol,
          ),
        ]);

        if (
          ![quote, profile, history].every(
            Array.isArray,
          )
        ) {
          throw new Error(
            'Invalid provider data.',
          );
        }

        const estimates =
          attachEstimateRevisions(
            estimateData,
            previousEstimates,
          );

        const metrics =
          buildScorecardMetrics(
            financials,
            {
              ...quote[0],
              currency:
                profile[0]?.currency,
            },
            {},
            history,
            estimates,
          );

        // The momentum service and metric builder use the same historical-price response cache.
        if (momentum) {
          metrics.priceAvg50 ??=
            momentum.sma50;
          metrics.priceAvg200 ??=
            momentum.sma200;
          metrics.yearHigh ??=
            momentum.yearHigh;
          metrics.yearLow ??=
            momentum.yearLow;
        }

        const normalizedRisk =
          calculateRiskScore({
            volatilityScore:
              risk.volatilityScore,
            beta:
              risk.volatility.beta,
            marketCap:
              metrics.dataQuality
                ?.quoteCurrency ===
              'USD'
                ? metrics.marketCap
                : null,
            debtToEquity:
              metrics.debtToEquity,
            currentRatio:
              metrics.currentRatio,
            netMargin:
              metrics.netMargin,
            freeCashFlow:
              metrics.freeCashFlow,
            peRatio: metrics.pe,
            priceToSalesRatio:
              metrics.priceToSales,
          });

        const preparedRisk = {
          ...risk,
          riskScore:
            normalizedRisk.score,
          riskLevel:
            normalizedRisk.level,
          riskCoverage:
            normalizedRisk.coverage,
          riskConfidence:
            normalizedRisk.confidence,
          riskComponents:
            normalizedRisk.components,
        };

        const input: PreparedInput = {
          symbol,
          company: {
            ...candidate,
            marketCap:
              metrics.marketCap,
            price: metrics.price,
            currency:
              metrics.dataQuality
                ?.quoteCurrency ??
              null,
          },
          financials,
          metrics,
          momentum: momentum
            ? {
                ...momentum,
                price: metrics.price,
                yearHigh:
                  metrics.yearHigh,
                yearLow:
                  metrics.yearLow,
                sma50:
                  metrics.priceAvg50,
                sma200:
                  metrics.priceAvg200,
                return1M:
                  metrics.return1m,
                return3M:
                  metrics.return3m,
                return6M:
                  metrics.return6m,
                return12M:
                  metrics.return12m,
              }
            : null,
          estimates,
          risk: preparedRisk,
          thesisData,
          calculationVersion:
            CALCULATION_VERSION,
          preparedAt:
            new Date().toISOString(),
          sourceObservations: {
            quote:
              quote[0] ?? {},
            profile:
              profile[0] ?? {},
            history: ordered(
              history,
            )
              .slice(0, 420)
              .map((row) => ({
                date: row.date,
                close:
                  row.close ?? null,
                adjClose:
                  row.adjClose ??
                  null,
                volume:
                  row.volume ?? null,
              })),
            observedAt:
              new Date().toISOString(),
          },
        };

        await heartbeat();

        await this.preparedStockRepository.saveInput(
          runId,
          input,
        );

        inputs.set(symbol, {
          symbol,
          company: input.company,
          metrics: input.metrics,
          calculationVersion:
            input.calculationVersion,
        });

        this.logger.log(
          `[Prepare] ${inputs.size}/${candidates.length} ${symbol}`,
        );
      } catch (error) {
        failures.push(symbol);

        this.logger.error(
          `[Prepare] ${symbol}: ${
            error instanceof Error
              ? error.message
              : String(error)
          }`,
        );
      }
    }

    if (failures.length) {
      throw new Error(
        `${failures.length} preparations failed; resume ${runId}. Examples: ${failures.slice(0, 10).join(', ')}`,
      );
    }

    const universe =
      candidates.map(
        (candidate) =>
          inputs.get(
            candidate.symbol,
          )!,
      );

    const peers =
      buildPeerContexts(
        universe,
      );

    const checkpoints = new Map(
      (
        await this.screenerResultsRepository.getStockCheckpoints(
          runId,
        )
      ).map((item) => [
        item.symbol,
        item,
      ]),
    );

    const output: RunnerResult = {
      screeners:
        Object.fromEntries(
          intelligenceCalculators.map(
            (calculator) => [
              calculator.id,
              [],
            ],
          ),
        ),
      snapshots: [],
    };

    const append = (
      checkpoint: StockIntelligenceCheckpoint,
    ): void => {
      output.snapshots.push(
        checkpoint.snapshot,
      );

      for (
        const calculator of
          intelligenceCalculators
      ) {
        const {
          score,
          coverage,
          eligible,
          confidence,
        } =
          checkpoint.calculations[
            calculator.id
          ];

        output.screeners[
          calculator.id
        ].push({
          symbol:
            checkpoint.symbol,
          score,
          coverage,
          eligible,
          confidence,
        });
      }
    };

    // Stage 2: all scorecard, Smart List and narrative calculators run against the frozen peer universe.
    for (const member of universe) {
      await heartbeat();

      const existing =
        checkpoints.get(
          member.symbol,
        );

      if (
        existing?.calculationVersion ===
          CALCULATION_VERSION &&
        existing.analysisVersion ===
          ANALYSIS_VERSION &&
        intelligenceCalculators.every(
          (calculator) =>
            existing.calculations[
              calculator.id
            ]?.eligible !== undefined,
        )
      ) {
        append(existing);
        continue;
      }

      const prepared =
        await this.preparedStockRepository.getInput(
          runId,
          member.symbol,
        );

      const metrics = {
        ...prepared.metrics,
        peers:
          peers.get(
            prepared.symbol,
          ) ?? {metrics: {}},
      };

      const input = {
        ...prepared,
        metrics,
      };

      const calculations: Record<
        string,
        CheckpointCalculation
      > = {};

      for (
        const calculator of
          intelligenceCalculators
      ) {
        const result =
          calculator.calculate(input);

        if (
          !Number.isFinite(
            result.score,
          ) ||
          !Number.isFinite(
            result.coverage,
          )
        ) {
          throw new Error(
            `Invalid ${calculator.id} for ${input.symbol}.`,
          );
        }

        calculations[
          calculator.id
        ] = result;
      }

      const scorecard =
        calculateScorecard(
          input.symbol,
          metrics,
          input.risk,
          input.financials,
        );

      const analysis =
        buildPreparedAnalysis({
          symbol: input.symbol,
          company: input.company,
          financials:
            input.financials,
          metrics,
          estimates:
            input.estimates,
          thesisData:
            input.thesisData,
          scorecard,
        });

      const snapshot: StockSnapshot = {
        symbol: input.symbol,
        companyName:
          input.company
            .companyName ||
          input.symbol,
        logoUrl:
          input.risk.logoUrl,
        riskScore:
          input.risk.riskScore,
        riskLevel:
          input.risk.riskLevel,
        volatilityScore:
          input.risk
            .volatilityScore,
      };

      await heartbeat();

      await this.preparedStockRepository.savePreparedStock(
        {
          runId,
          prepared: input,
          snapshot,
          calculations,
          scorecard,
          analysis,
        },
      );

      append({
        symbol: input.symbol,
        snapshot,
        calculations,
        calculationVersion:
          CALCULATION_VERSION,
        analysisVersion:
          ANALYSIS_VERSION,
      });

      this.logger.log(
        `[Calculate] ${output.snapshots.length}/${universe.length} ${input.symbol}`,
      );
    }

    return output;
  }
}
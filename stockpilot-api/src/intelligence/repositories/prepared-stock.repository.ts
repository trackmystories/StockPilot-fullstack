import { enforceScorecardEvidence } from '../scorecard-evidence';
import { Injectable } from '@nestjs/common';
import { FieldValue } from 'firebase-admin/firestore';
import { FirebaseService } from '../../firebase/firebase.service';
import type { FmpScreenedCompany } from '../../fmp/services/fmp-stock-screener.service';
import { ANALYSIS_VERSION } from '../analysis-version';
import {
  CALCULATION_VERSION,
  PREPARED_MAX_AGE_MS,
} from '../calculation-version';
import type { EstimatesData } from '../calculators/calculator.type';
import type {
  PreparedAnalysis,
  PreparedInput,
} from '../prepared-stock.type';
import type {
  StockIntelligence,
  StockSnapshot,
} from '../types';
import type { CheckpointCalculation } from './screener-results.repository';

export type PreparedStockIntelligence = {
  symbol: string;
  snapshot: StockSnapshot;
  calculations: Record<
    string,
    CheckpointCalculation
  >;
};

@Injectable()
export class PreparedStockRepository {
  constructor(
    private readonly firebase: FirebaseService,
  ) { }

  private symbol(
    value: string,
  ): string {
    const symbol =
      value.trim().toUpperCase();

    if (
      !/^[A-Z0-9][A-Z0-9.^-]{0,19}$/.test(
        symbol,
      )
    ) {
      throw new Error(
        'Invalid stock symbol.',
      );
    }

    return symbol;
  }

  async getUniverse(
    runId: string,
  ): Promise<
    FmpScreenedCompany[] | null
  > {
    const ref =
      this.firebase.db
        .collection(
          'screenerRuns',
        )
        .doc(runId);

    const run =
      await ref.get();

    const count =
      run.data()?.universeCount;

    if (
      typeof count !== 'number'
    ) {
      return null;
    }

    const snapshot =
      await ref
        .collection('universe')
        .get();

    if (
      snapshot.size !== count
    ) {
      throw new Error(
        'Incomplete frozen stock universe.',
      );
    }

    return snapshot.docs.map(
      (doc) =>
        doc.data() as FmpScreenedCompany,
    );
  }

  async saveUniverse(
    runId: string,
    candidates: FmpScreenedCompany[],
  ): Promise<void> {
    const ref =
      this.firebase.db
        .collection(
          'screenerRuns',
        )
        .doc(runId);

    const previous =
      await ref
        .collection('universe')
        .get();

    for (
      let start = 0;
      start < previous.docs.length;
      start += 450
    ) {
      const batch =
        this.firebase.db.batch();

      previous.docs
        .slice(
          start,
          start + 450,
        )
        .forEach((doc) =>
          batch.delete(doc.ref),
        );

      await batch.commit();
    }

    for (
      let start = 0;
      start < candidates.length;
      start += 450
    ) {
      const batch =
        this.firebase.db.batch();

      candidates
        .slice(
          start,
          start + 450,
        )
        .forEach(
          (candidate) =>
            batch.set(
              ref
                .collection(
                  'universe',
                )
                .doc(
                  this.symbol(
                    candidate.symbol,
                  ),
                ),
              candidate,
            ),
        );

      await batch.commit();
    }

    await ref.set(
      {
        universeCount:
          candidates.length,
      },
      { merge: true },
    );
  }

  async getInputs(
    runId: string,
  ): Promise<
    Pick<
      PreparedInput,
      | 'symbol'
      | 'company'
      | 'metrics'
      | 'calculationVersion'
    >[]
  > {
    const snapshot =
      await this.firebase.db
        .collection(
          'screenerRuns',
        )
        .doc(runId)
        .collection(
          'preparedInputs',
        )
        .select(
          'symbol',
          'company',
          'metrics',
          'calculationVersion',
        )
        .get();

    return snapshot.docs
      .map(
        (doc) =>
          doc.data() as Pick<
            PreparedInput,
            | 'symbol'
            | 'company'
            | 'metrics'
            | 'calculationVersion'
          >,
      )
      .filter(
        (input) =>
          input.calculationVersion ===
          CALCULATION_VERSION,
      );
  }

  async getInput(
    runId: string,
    symbol: string,
  ): Promise<PreparedInput> {
    const doc =
      await this.firebase.db
        .collection(
          'screenerRuns',
        )
        .doc(runId)
        .collection(
          'preparedInputs',
        )
        .doc(
          this.symbol(symbol),
        )
        .get();

    const input =
      doc.data() as
      | PreparedInput
      | undefined;

    if (
      !input ||
      input.calculationVersion !==
      CALCULATION_VERSION
    ) {
      throw new Error(
        'Prepared input is missing or incompatible.',
      );
    }

    return input;
  }

  async saveInput(
    runId: string,
    input: PreparedInput,
  ): Promise<void> {
    await this.firebase.db
      .collection(
        'screenerRuns',
      )
      .doc(runId)
      .collection(
        'preparedInputs',
      )
      .doc(
        this.symbol(
          input.symbol,
        ),
      )
      .set(input);
  }

  async getPreviousEstimates(
    symbol: string,
  ): Promise<EstimatesData | null> {
    const normalized =
      this.symbol(symbol);

    const before = new Date(
      Date.now() -
      5 * 86400000,
    ).toISOString();

    const history =
      await this.firebase.db
        .collection(
          'stockEstimateSnapshots',
        )
        .doc(normalized)
        .collection(
          'observations',
        )
        .where(
          'observedAt',
          '<=',
          before,
        )
        .orderBy(
          'observedAt',
          'desc',
        )
        .limit(1)
        .get();

    if (!history.empty) {
      return history.docs[0].data() as EstimatesData;
    }

    const doc =
      await this.firebase.db
        .collection(
          'stockIntelligence',
        )
        .doc(normalized)
        .get();

    return doc.exists
      ? ((doc.data()
        ?.estimates as
        | EstimatesData
        | null) ?? null)
      : null;
  }

  async savePreparedStock(input: {
    runId: string;
    prepared: PreparedInput;
    snapshot: StockSnapshot;
    calculations: Record<
      string,
      CheckpointCalculation
    >;
    scorecard: StockIntelligence;
    analysis: PreparedAnalysis;
  }): Promise<void> {
    const {
      runId,
      prepared,
      snapshot,
      calculations,
      scorecard,
      analysis,
    } = input;

    const symbol = this.symbol(
      prepared.symbol,
    );

    const metadata = {
      symbol,
      sourceRunId: runId,
      calculationVersion:
        CALCULATION_VERSION,
      analysisVersion:
        ANALYSIS_VERSION,
      calculatedAt: Date.now(),
      updatedAt:
        FieldValue.serverTimestamp(),
    };

    const intelligence = {
      ...metadata,
      snapshot,
      calculations,
      metrics:
        prepared.metrics,
      estimates:
        prepared.estimates,
      risk: prepared.risk,
      analysis,
    };

    const scorecardDocument = {
      ...metadata,
      schemaVersion:
        CALCULATION_VERSION,
      data: scorecard,
    };

    const run =
      this.firebase.db
        .collection(
          'screenerRuns',
        )
        .doc(runId);

    // Checkpoint and EVERY completed output commit together. A resume cannot skip an unpublished stock.
    const batch =
      this.firebase.db.batch();

    batch.set(
      this.firebase.db
        .collection(
          'stockFinancials',
        )
        .doc(symbol),
      {
        ...metadata,
        ...prepared.financials,
      },
    );

    batch.set(
      this.firebase.db
        .collection(
          'stockIntelligence',
        )
        .doc(symbol),
      intelligence,
    );

    batch.set(
      this.firebase.db
        .collection(
          'stockScorecards',
        )
        .doc(symbol),
      scorecardDocument,
    );

    batch.set(
      run
        .collection(
          'intelligence',
        )
        .doc(symbol),
      intelligence,
    );

    batch.set(
      run
        .collection(
          'scorecards',
        )
        .doc(symbol),
      scorecardDocument,
    );

    batch.set(
      run
        .collection(
          'checkpoints',
        )
        .doc(symbol),
      {
        symbol,
        snapshot,
        calculations,
        calculationVersion:
          CALCULATION_VERSION,
        analysisVersion:
          ANALYSIS_VERSION,
        completedAt:
          FieldValue.serverTimestamp(),
      },
    );

    if (
      prepared.estimates
        ?.observedAt
    ) {
      batch.set(
        this.firebase.db
          .collection(
            'stockEstimateSnapshots',
          )
          .doc(symbol)
          .collection(
            'observations',
          )
          .doc(runId),
        prepared.estimates,
      );
    }

    await batch.commit();
  }

  // Read the active generation, so a partially built run never leaks into mobile responses.
  async getPrepared(
    rawSymbol: string,
    kind:
      | 'scorecards'
      | 'intelligence',
  ): Promise<
    Record<string, any> | null
  > {
    const symbol =
      this.symbol(rawSymbol);

    const state =
      await this.firebase.db
        .collection(
          'screenerState',
        )
        .doc('current')
        .get();

    const runId =
      state.data()?.activeRun;

    if (
      typeof runId !== 'string'
    ) {
      return null;
    }

    const doc =
      await this.firebase.db
        .collection(
          'screenerRuns',
        )
        .doc(runId)
        .collection(kind)
        .doc(symbol)
        .get();

    const data = doc.data();

    if (
      !data ||
      ![
        2,
        3,
        CALCULATION_VERSION,
      ].includes(
        data.calculationVersion,
      ) ||
      typeof data.calculatedAt !==
      'number'
    ) {
      return null;
    }

    const observedAt =
      data.inputPreparedAt ===
        undefined
        ? data.calculatedAt
        : Date.parse(
          data.inputPreparedAt,
        );

    const freshnessAt =
      Math.min(
        data.calculatedAt,
        observedAt,
      );

    return {
      ...data,
      stale:
        !Number.isFinite(
          freshnessAt,
        ) ||
        freshnessAt >
        Date.now() ||
        Date.now() -
        freshnessAt >
        PREPARED_MAX_AGE_MS,
    };
  }

  async getScorecard(
    symbol: string,
  ): Promise<
    StockIntelligence | null
  > {
    const stored =
      await this.getPrepared(
        symbol,
        'scorecards',
      );

    return stored?.data
      ? {
        ...enforceScorecardEvidence(
          stored.data,
        ),
        sourceRunId:
          stored.sourceRunId,
        calculationVersion:
          stored.calculationVersion,
        analysisVersion:
          stored.analysisVersion,
        stale: stored.stale,
      }
      : null;
  }

  async getAnalysis(
    symbol: string,
  ): Promise<
    PreparedAnalysis | null
  > {
    const stored =
      await this.getPrepared(
        symbol,
        'intelligence',
      );

    return stored?.analysis
      ? {
        ...stored.analysis,
        sourceRunId:
          stored.sourceRunId,
        calculationVersion:
          stored.calculationVersion,
        analysisVersion:
          stored.analysisVersion,
        stale: stored.stale,
      }
      : null;
  }
}
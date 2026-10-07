import {Injectable} from '@nestjs/common';
import {FieldValue} from 'firebase-admin/firestore';
import {FirebaseService} from '../../firebase/firebase.service';
import {ANALYSIS_VERSION} from '../analysis-version';
import {CALCULATION_VERSION, isReadableCalculationVersion} from '../calculation-version';
import {nextActivationState, rollbackActivationState} from '../run-activation-state';
import {intelligenceCalculators} from '../calculators/calculator.registry';
import type {IntelligenceCalculatorResult} from '../calculators/calculator.type';
import type {StockSnapshot} from '../types';
import type {
  RankedScreenerResult,
  ScreenerRunStatus,
} from '../types/screener-result';

export type ActiveScreenerRun = {
  activeRun: string;
  previousActiveRun?: string | null;
  recentActiveRuns?: string[];
  lastHealthyRun?: string | null;
};

export type CheckpointCalculation =
  IntelligenceCalculatorResult;

export type StockIntelligenceCheckpoint = {
  calculationVersion?: number;
  analysisVersion?: number;
  symbol: string;
  snapshot: StockSnapshot;
  calculations: Record<
    string,
    CheckpointCalculation
  >;
};

type StoredCheckpointDocument = {
  calculationVersion?: number;
  analysisVersion?: number;
  symbol?: string;
  snapshot?: StockSnapshot;
  calculations?: Record<
    string,
    CheckpointCalculation
  >;
};

@Injectable()
export class ScreenerResultsRepository {
  constructor(
    private readonly firebaseService: FirebaseService,
  ) {}

  async acquireLease(
    owner: string,
  ): Promise<boolean> {
    const ref =
      this.firebaseService.db
        .collection(
          'screenerState',
        )
        .doc('lease');

    return this.firebaseService.db.runTransaction(
      async (tx) => {
        const doc =
          await tx.get(ref);

        if (
          (doc.data()?.expiresAt ??
            0) > Date.now()
        ) {
          return false;
        }

        tx.set(ref, {
          owner,
          expiresAt:
            Date.now() +
            30 * 60 * 1000,
        });

        return true;
      },
    );
  }

  async renewLease(
    owner: string,
  ): Promise<void> {
    const ref =
      this.firebaseService.db
        .collection(
          'screenerState',
        )
        .doc('lease');

    await this.firebaseService.db.runTransaction(
      async (tx) => {
        const doc =
          await tx.get(ref);

        if (
          doc.data()?.owner !==
            owner ||
          doc.data()?.expiresAt <
            Date.now()
        ) {
          throw new Error(
            'Intelligence lease lost.',
          );
        }

        tx.set(ref, {
          owner,
          expiresAt:
            Date.now() +
            30 * 60 * 1000,
        });
      },
    );
  }

  async releaseLease(
    owner: string,
  ): Promise<void> {
    const ref =
      this.firebaseService.db
        .collection(
          'screenerState',
        )
        .doc('lease');

    await this.firebaseService.db.runTransaction(
      async (tx) => {
        const doc =
          await tx.get(ref);

        if (
          doc.data()?.owner ===
          owner
        ) {
          tx.delete(ref);
        }
      },
    );
  }

  async assertCompleteCheckpoints(
    runId: string,
  ): Promise<void> {
    const runRef =
      this.firebaseService.db
        .collection(
          'screenerRuns',
        )
        .doc(runId);

    const [
      run,
      universe,
      checkpoints,
      scorecards,
      intelligence,
    ] = await Promise.all([
      runRef.get(),
      runRef
        .collection('universe')
        .get(),
      runRef
        .collection(
          'checkpoints',
        )
        .select(
          'calculationVersion',
          'analysisVersion',
        )
        .get(),
      runRef
        .collection(
          'scorecards',
        )
        .select(
          'calculationVersion',
          'analysisVersion',
        )
        .get(),
      runRef
        .collection(
          'intelligence',
        )
        .select(
          'calculationVersion',
          'analysisVersion',
        )
        .get(),
    ]);

    const count =
      run.data()?.universeCount;

    const complete = (
      docs: typeof checkpoints.docs,
    ): boolean => {
      const symbols = new Set(
        docs
          .filter(
            (doc) =>
              doc.data()
                .calculationVersion ===
                CALCULATION_VERSION &&
              doc.data()
                .analysisVersion ===
                ANALYSIS_VERSION,
          )
          .map(
            (doc) => doc.id,
          ),
      );

      return universe.docs.every(
        (doc) =>
          symbols.has(doc.id),
      );
    };

    if (
      !count ||
      universe.size !== count ||
      !complete(
        checkpoints.docs,
      ) ||
      !complete(
        scorecards.docs,
      ) ||
      !complete(
        intelligence.docs,
      )
    ) {
      throw new Error(
        'Cannot publish an incomplete run. Resume preparation first.',
      );
    }
  }

  /*
   * --------------------------------------------------
   * RUN MANAGEMENT
   * --------------------------------------------------
   */

  async createRun(
    runId: string,
  ): Promise<void> {
    await this.firebaseService.db
      .collection(
        'screenerRuns',
      )
      .doc(runId)
      .set(
        {
          status:
            'building' satisfies ScreenerRunStatus,
          calculationVersion:
            CALCULATION_VERSION,
          analysisVersion:
            ANALYSIS_VERSION,
          startedAt:
            FieldValue.serverTimestamp(),
          completedAt: null,
          processedCount: 0,
          updatedAt:
            FieldValue.serverTimestamp(),
        },
        {merge: true},
      );
  }

  /*
   * Find the newest unfinished intelligence run.
   *
   * If the server was stopped while a run was still
   * building, the weekly job can reuse that runId
   * and continue from its saved checkpoints.
   */
  async getResumableRun(): Promise<
    string | null
  > {
    const snapshot =
      await this.firebaseService.db
        .collection(
          'screenerRuns',
        )
        .where(
          'status',
          'in',
          [
            'building',
            'completed',
          ],
        )
        .get();

    if (snapshot.empty) {
      return null;
    }

    const runs = snapshot.docs
      .filter(
        (doc) =>
          doc.data()
            .calculationVersion ===
            CALCULATION_VERSION &&
          doc.data()
            .analysisVersion ===
            ANALYSIS_VERSION &&
          !doc.data()
            .activatedAt &&
          (doc
            .data()
            .startedAt?.toMillis?.() ??
            0) >=
            Date.now() -
              8 * 86400000,
      )
      .map((document) => {
        const data =
          document.data();

        const startedAt =
          data.startedAt;

        const startedAtMillis =
          startedAt &&
          typeof startedAt.toMillis ===
            'function'
            ? startedAt.toMillis()
            : 0;

        return {
          id: document.id,
          startedAtMillis,
        };
      })
      .sort(
        (a, b) =>
          b.startedAtMillis -
          a.startedAtMillis,
      );

    return runs[0]?.id ?? null;
  }

  /*
   * --------------------------------------------------
   * CHECKPOINTS
   * --------------------------------------------------
   *
   * Each successfully processed company gets one
   * Firestore document:
   *
   * screenerRuns/{runId}/checkpoints/{SYMBOL}
   *
   * Because the symbol is the document ID,
   * saving AAPL again replaces the AAPL checkpoint
   * rather than creating a duplicate.
   */

  async saveStockCheckpoint(
    runId: string,
    checkpoint: StockIntelligenceCheckpoint,
  ): Promise<void> {
    const symbol =
      checkpoint.symbol
        .trim()
        .toUpperCase();

    if (!symbol) {
      return;
    }

    const runRef =
      this.firebaseService.db
        .collection(
          'screenerRuns',
        )
        .doc(runId);

    const checkpointRef =
      runRef
        .collection(
          'checkpoints',
        )
        .doc(symbol);

    const batch =
      this.firebaseService.db.batch();

    batch.set(
      checkpointRef,
      {
        symbol,
        snapshot:
          checkpoint.snapshot,
        calculations:
          checkpoint.calculations,
        calculationVersion:
          CALCULATION_VERSION,
        analysisVersion:
          ANALYSIS_VERSION,
        completedAt:
          FieldValue.serverTimestamp(),
      },
      {merge: true},
    );

    batch.set(
      runRef,
      {
        updatedAt:
          FieldValue.serverTimestamp(),
      },
      {merge: true},
    );

    await batch.commit();
  }

  async getStockCheckpoints(
    runId: string,
  ): Promise<
    StockIntelligenceCheckpoint[]
  > {
    const snapshot =
      await this.firebaseService.db
        .collection(
          'screenerRuns',
        )
        .doc(runId)
        .collection(
          'checkpoints',
        )
        .select(
          'symbol',
          'snapshot',
          'calculationVersion',
          'analysisVersion',
          ...intelligenceCalculators.flatMap(
            (calculator) =>
              [
                'score',
                'coverage',
                'eligible',
                'confidence',
                'reasons',
              ].map(
                (key) =>
                  `calculations.${calculator.id}.${key}`,
              ),
          ),
        )
        .get();

    const checkpoints: StockIntelligenceCheckpoint[] =
      [];

    for (
      const document of
        snapshot.docs
    ) {
      const data =
        document.data() as StoredCheckpointDocument;

      const symbol = (
        data.symbol ??
        document.id
      )
        .trim()
        .toUpperCase();

      if (!symbol) {
        continue;
      }

      if (
        data.calculationVersion !==
          CALCULATION_VERSION ||
        data.analysisVersion !==
          ANALYSIS_VERSION ||
        !data.snapshot ||
        !data.calculations
      ) {
        continue;
      }

      checkpoints.push({
        symbol,
        calculationVersion:
          data.calculationVersion,
        analysisVersion:
          data.analysisVersion,
        snapshot: {
          ...data.snapshot,
          symbol,
        },
        calculations:
          data.calculations,
      });
    }

    return checkpoints;
  }

  async getProcessedSymbols(
    runId: string,
  ): Promise<Set<string>> {
    const checkpoints =
      await this.getStockCheckpoints(
        runId,
      );

    return new Set(
      checkpoints.map(
        (checkpoint) =>
          checkpoint.symbol,
      ),
    );
  }

  /*
   * --------------------------------------------------
   * FINAL SCREENER RESULTS
   * --------------------------------------------------
   */

  async saveScreenerResults(
    runId: string,
    screenerId: string,
    results: RankedScreenerResult[],
  ): Promise<void> {
    const screenerRef =
      this.firebaseService.db
        .collection(
          'screenerRuns',
        )
        .doc(runId)
        .collection(
          'screeners',
        )
        .doc(screenerId);

    const previous =
      await screenerRef
        .collection('results')
        .get();

    for (
      let start = 0;
      start < previous.docs.length;
      start += 450
    ) {
      const batch =
        this.firebaseService.db.batch();

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

    await screenerRef.set({
      id: screenerId,
      resultCount:
        results.length,
      updatedAt:
        FieldValue.serverTimestamp(),
    });

    if (!results.length) {
      return;
    }

    const maxBatchSize = 450;

    for (
      let start = 0;
      start < results.length;
      start += maxBatchSize
    ) {
      const chunk =
        results.slice(
          start,
          start + maxBatchSize,
        );

      const batch =
        this.firebaseService.db.batch();

      for (
        const result of chunk
      ) {
        const resultRef =
          screenerRef
            .collection(
              'results',
            )
            .doc(
              result.symbol,
            );

        batch.set(resultRef, {
          symbol:
            result.symbol,
          score: result.score,
          coverage:
            result.coverage,
          rank: result.rank,
          confidence:
            result.confidence ??
            'low',
          eligible:
            result.eligible ===
            true,
        });
      }

      await batch.commit();
    }
  }

  /*
   * --------------------------------------------------
   * STOCK SNAPSHOTS
   * --------------------------------------------------
   */

  async saveStockSnapshots(
    snapshots: StockSnapshot[],
  ): Promise<void> {
    if (!snapshots.length) {
      return;
    }

    const maxBatchSize = 450;

    for (
      let start = 0;
      start < snapshots.length;
      start += maxBatchSize
    ) {
      const chunk =
        snapshots.slice(
          start,
          start + maxBatchSize,
        );

      const batch =
        this.firebaseService.db.batch();

      for (
        const snapshot of chunk
      ) {
        const snapshotRef =
          this.firebaseService.db
            .collection(
              'stockSnapshots',
            )
            .doc(
              snapshot.symbol,
            );

        batch.set(
          snapshotRef,
          {
            symbol:
              snapshot.symbol,
            companyName:
              snapshot.companyName,
            logoUrl:
              snapshot.logoUrl,
            riskScore:
              snapshot.riskScore,
            riskLevel:
              snapshot.riskLevel,
            volatilityScore:
              snapshot.volatilityScore,
            updatedAt:
              FieldValue.serverTimestamp(),
          },
          {merge: true},
        );
      }

      await batch.commit();
    }
  }

  async getStockSnapshots(
    symbols: string[],
    sourceRunId?: string | null,
  ): Promise<
    Map<string, StockSnapshot>
  > {
    const normalized = symbols
      .map((symbol) =>
        symbol
          .trim()
          .toUpperCase(),
      )
      .filter(Boolean);

    if (!normalized.length) {
      return new Map();
    }

    const runId =
      sourceRunId ??
      (await this.getActiveRun());

    if (!runId) {
      return new Map();
    }

    const refs =
      normalized.map(
        (symbol) =>
          this.firebaseService.db
            .collection(
              'screenerRuns',
            )
            .doc(runId)
            .collection(
              'checkpoints',
            )
            .doc(symbol),
      );

    const documents =
      await this.firebaseService.db.getAll(
        ...refs,
      );

    const snapshots =
      new Map<
        string,
        StockSnapshot
      >();

    for (
      const document of
        documents
    ) {
      if (
        !document.exists
      ) {
        continue;
      }

      const data = (
        document.data()
          ?.snapshot ?? {}
      ) as Partial<StockSnapshot>;

      const symbol = (
        data.symbol ??
        document.id
      )
        .trim()
        .toUpperCase();

      snapshots.set(symbol, {
        symbol,
        companyName:
          data.companyName ??
          symbol,
        logoUrl:
          data.logoUrl ?? null,
        riskScore:
          data.riskScore ??
          null,
        riskLevel:
          data.riskLevel ??
          null,
        volatilityScore:
          data.volatilityScore ??
          null,
      });
    }

    return snapshots;
  }

  /*
   * --------------------------------------------------
   * COMPLETE / FAIL / ACTIVATE
   * --------------------------------------------------
   */

  async completeRun(
    runId: string,
  ): Promise<void> {
    await this.assertCompleteCheckpoints(
      runId,
    );

    await this.firebaseService.db
      .collection(
        'screenerRuns',
      )
      .doc(runId)
      .set(
        {
          status:
            'completed' satisfies ScreenerRunStatus,
          completedAt:
            FieldValue.serverTimestamp(),
          updatedAt:
            FieldValue.serverTimestamp(),
        },
        {merge: true},
      );
  }

  async failRun(
    runId: string,
    message: string,
  ): Promise<void> {
    await this.firebaseService.db
      .collection(
        'screenerRuns',
      )
      .doc(runId)
      .set(
        {
          status:
            'failed' satisfies ScreenerRunStatus,
          completedAt:
            FieldValue.serverTimestamp(),
          updatedAt:
            FieldValue.serverTimestamp(),
          error: message,
        },
        {merge: true},
      );
  }

  async assertRunCanServe(runId: string): Promise<void> {
    const db = this.firebaseService.db;
    const runRef = db.collection('screenerRuns').doc(runId);
    const [run, universeCount, checkpointCount, scorecardCount, intelligenceCount] = await Promise.all([
      runRef.get(),
      runRef.collection('universe').count().get(),
      runRef.collection('checkpoints').count().get(),
      runRef.collection('scorecards').count().get(),
      runRef.collection('intelligence').count().get(),
    ]);

    const data = run.data();
    const expectedCount = data?.universeCount;

    if (
      data?.status !== 'completed' ||
      !isReadableCalculationVersion(data?.calculationVersion) ||
      data?.analysisVersion !== ANALYSIS_VERSION ||
      typeof expectedCount !== 'number' ||
      expectedCount < 1
    ) {
      throw new Error('Run is not a completed readable intelligence generation.');
    }

    const counts = {
      universe: universeCount.data().count,
      checkpoints: checkpointCount.data().count,
      scorecards: scorecardCount.data().count,
      intelligence: intelligenceCount.data().count,
    };

    if (Object.values(counts).some((count) => count !== expectedCount)) {
      throw new Error(
        `Run ${runId} is incomplete: expected ${expectedCount}, received ${JSON.stringify(counts)}.`,
      );
    }

    const screenerRefs = intelligenceCalculators.map((calculator) =>
      runRef.collection('screeners').doc(calculator.id),
    );
    const screenerDocs = screenerRefs.length ? await db.getAll(...screenerRefs) : [];

    if (screenerDocs.some((document) => !document.exists)) {
      throw new Error(`Run ${runId} is missing one or more published screeners.`);
    }

    const sample = await runRef.collection('universe').limit(Math.min(5, expectedCount)).get();

    for (const document of sample.docs) {
      const symbol = document.id;
      const [checkpoint, scorecard, intelligence] = await db.getAll(
        runRef.collection('checkpoints').doc(symbol),
        runRef.collection('scorecards').doc(symbol),
        runRef.collection('intelligence').doc(symbol),
      );

      for (const output of [checkpoint, scorecard, intelligence]) {
        const outputData = output.data();
        if (!output.exists || !isReadableCalculationVersion(outputData?.calculationVersion)) {
          throw new Error(`Run ${runId} failed serving validation for ${symbol}.`);
        }
      }
    }
  }

  async activateRun(runId: string, owner: string): Promise<void> {
    await this.assertRunCanServe(runId);

    const db = this.firebaseService.db;
    const ref = db.collection('screenerRuns').doc(runId);
    const leaseRef = db.collection('screenerState').doc('lease');
    const stateRef = db.collection('screenerState').doc('current');

    await db.runTransaction(async (tx) => {
      const [run, lease, state] = await Promise.all([tx.get(ref), tx.get(leaseRef), tx.get(stateRef)]);

      if (
        run.data()?.status !== 'completed' ||
        run.data()?.calculationVersion !== CALCULATION_VERSION ||
        run.data()?.analysisVersion !== ANALYSIS_VERSION
      ) {
        throw new Error('Cannot activate an incomplete or incompatible run.');
      }

      if (!owner || lease.data()?.owner !== owner || !(lease.data()?.expiresAt > Date.now())) {
        throw new Error('Cannot activate run: intelligence lease lost.');
      }

      const activation = nextActivationState((state.data() ?? {}) as ActiveScreenerRun, runId);

      tx.set(
        stateRef,
        {
          ...activation,
          activatedAt: FieldValue.serverTimestamp(),
          activationHealth: 'pending',
        },
        {merge: true},
      );
      tx.set(
        ref,
        {
          activatedAt: FieldValue.serverTimestamp(),
          activationHealth: 'pending',
        },
        {merge: true},
      );
    });
  }

  async assertActiveRunHealthy(runId: string): Promise<void> {
    const state = await this.firebaseService.db.collection('screenerState').doc('current').get();

    if (state.data()?.activeRun !== runId) {
      throw new Error(`Run ${runId} is no longer the active intelligence generation.`);
    }

    await this.assertRunCanServe(runId);
  }

  async markActiveRunHealthy(runId: string): Promise<void> {
    const db = this.firebaseService.db;
    const stateRef = db.collection('screenerState').doc('current');
    const runRef = db.collection('screenerRuns').doc(runId);

    await db.runTransaction(async (tx) => {
      const state = await tx.get(stateRef);
      if (state.data()?.activeRun !== runId) {
        throw new Error(`Cannot mark ${runId} healthy because it is not active.`);
      }

      tx.set(
        stateRef,
        {
          lastHealthyRun: runId,
          activationHealth: 'healthy',
          healthCheckedAt: FieldValue.serverTimestamp(),
        },
        {merge: true},
      );
      tx.set(
        runRef,
        {
          activationHealth: 'healthy',
          healthCheckedAt: FieldValue.serverTimestamp(),
        },
        {merge: true},
      );
    });
  }

  async rollbackActiveRun(failedRunId: string, owner: string, reason: string): Promise<string> {
    const db = this.firebaseService.db;
    const stateRef = db.collection('screenerState').doc('current');
    const leaseRef = db.collection('screenerState').doc('lease');
    const stateSnapshot = await stateRef.get();
    const state = (stateSnapshot.data() ?? {}) as ActiveScreenerRun;
    const previousRunId = state.previousActiveRun;

    if (!previousRunId) {
      throw new Error('Automatic rollback failed: no previous active run is recorded.');
    }

    await this.assertRunCanServe(previousRunId);

    await db.runTransaction(async (tx) => {
      const [latestState, lease] = await Promise.all([tx.get(stateRef), tx.get(leaseRef)]);
      if (!owner || lease.data()?.owner !== owner || !(lease.data()?.expiresAt > Date.now())) {
        throw new Error('Cannot roll back run: intelligence lease lost.');
      }

      const rollback = rollbackActivationState(
        (latestState.data() ?? {}) as ActiveScreenerRun,
        failedRunId,
      );

      tx.set(
        stateRef,
        {
          ...rollback,
          lastHealthyRun: previousRunId,
          activationHealth: 'rolled_back',
          rollbackAt: FieldValue.serverTimestamp(),
          rollbackReason: reason,
        },
        {merge: true},
      );
      tx.set(
        db.collection('screenerRuns').doc(failedRunId),
        {
          activationHealth: 'rolled_back',
          rolledBackAt: FieldValue.serverTimestamp(),
          rollbackReason: reason,
        },
        {merge: true},
      );
    });

    return previousRunId;
  }

  /*
   * --------------------------------------------------
   * ACTIVE RUN
   * --------------------------------------------------
   */

  async getActiveState(): Promise<ActiveScreenerRun | null> {
    const snapshot = await this.firebaseService.db.collection('screenerState').doc('current').get();

    if (!snapshot.exists) {
      return null;
    }

    return (snapshot.data() as ActiveScreenerRun | undefined) ?? null;
  }

  async getActiveRun(): Promise<string | null> {
    return (await this.getActiveState())?.activeRun ?? null;
  }

  /*
   * --------------------------------------------------
   * READ SCREENER RESULTS
   * --------------------------------------------------
   */

  async getResults(
    screenerId: string,
    page = 0,
    limit = 20,
  ): Promise<{
    items: RankedScreenerResult[];
    page: number;
    limit: number;
    hasMore: boolean;
    total: number;
    runId: string | null;
  }> {
    const normalizedPage =
      Number.isFinite(page) &&
      page >= 0
        ? Math.floor(page)
        : 0;

    const normalizedLimit =
      Number.isFinite(limit) &&
      limit > 0
        ? Math.min(
            Math.floor(limit),
            50,
          )
        : 20;

    const runId =
      await this.getActiveRun();

    if (!runId) {
      return {
        items: [],
        page: normalizedPage,
        limit: normalizedLimit,
        hasMore: false,
        total: 0,
        runId: null,
      };
    }

    const screenerRef =
      this.firebaseService.db
        .collection(
          'screenerRuns',
        )
        .doc(runId)
        .collection(
          'screeners',
        )
        .doc(screenerId);

    const screenerSnapshot =
      await screenerRef.get();

    if (
      !screenerSnapshot.exists
    ) {
      return {
        items: [],
        page: normalizedPage,
        limit: normalizedLimit,
        hasMore: false,
        total: 0,
        runId,
      };
    }

    const screenerData =
      screenerSnapshot.data() as {
        resultCount?: number;
      };

    const total =
      screenerData.resultCount ??
      0;

    const offset =
      normalizedPage *
      normalizedLimit;

    const resultsSnapshot =
      await screenerRef
        .collection('results')
        .orderBy(
          'rank',
          'asc',
        )
        .offset(offset)
        .limit(
          normalizedLimit,
        )
        .get();

    const items =
      resultsSnapshot.docs.map(
        (doc) =>
          doc.data() as RankedScreenerResult,
      );

    return {
      items,
      page: normalizedPage,
      limit: normalizedLimit,
      hasMore:
        offset + items.length <
        total,
      total,
      runId,
    };
  }
}
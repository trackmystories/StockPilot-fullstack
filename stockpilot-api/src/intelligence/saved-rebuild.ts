import {createHash, randomUUID} from 'node:crypto';
import type {DocumentReference, Firestore, Transaction} from 'firebase-admin/firestore';
import {readSavedSecEvidence} from './sec-score-inputs';
import {ANALYSIS_VERSION} from './analysis-version';
import {buildPreparedAnalysis} from './build-prepared-analysis';
import {calculateScorecard} from './calculate-scorecard';
import {CALCULATION_VERSION, isReadableCalculationVersion} from './calculation-version';
import {nextActivationState} from './run-activation-state';
import {intelligenceCalculators} from './calculators/calculator.registry';
import {buildPeerContexts, type PeerStock} from './peer-context';
import {ScreenerRankingService} from './pipeline/screener-ranking.service';
import type {PreparedInput} from './prepared-stock.type';
import {recalculatePrepared} from './recalculate-prepared';
import type {CalculatedScreenerResult} from './types/screener-result';

const REBUILD_VERSION = 1;
const LEASE_MS = 30 * 60 * 1000;

export type SavedRebuildOptions = {
  runId: string;
  sourceRunId?: string;
  codeHash: string;
  asOf?: string;
  signal?: AbortSignal;
};

function documentId(value: string): string {
  if (!/^[A-Za-z0-9][A-Za-z0-9._^-]{0,180}$/.test(value)) {
    throw new Error('Invalid run or symbol ID.');
  }

  return value;
}

function plain<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, item) => {
      if (typeof item === 'number' && !Number.isFinite(item)) {
        throw new Error('Non-finite calculation output.');
      }

      return item;
    }),
  ) as T;
}

export async function rebuildSavedUniverse(
  db: Firestore,
  options: SavedRebuildOptions,
  log: (message: string) => void = console.log,
): Promise<{
  runId: string;
  count: number;
}> {
  const checkInterrupted = () => {
    if (options.signal?.aborted) {
      throw new Error('Rebuild interrupted. Repeat the same command to resume.');
    }
  };

  checkInterrupted();

  const target = db.collection('screenerRuns').doc(documentId(options.runId));

  const currentRef = db.doc('screenerState/current');

  const leaseRef = db.doc('screenerState/lease');

  const previous = (await target.get()).data();

  const current = (await currentRef.get()).data()?.activeRun ?? null;

  const sourceRunId = documentId(options.sourceRunId ?? previous?.sourceRunId ?? current ?? '');

  if (sourceRunId === options.runId) {
    throw new Error('Source and target runs must differ.');
  }

  const source = db.collection('screenerRuns').doc(sourceRunId);

  const sourceMeta = (await source.get()).data();

  if (sourceMeta?.status !== 'completed' || !isReadableCalculationVersion(sourceMeta.calculationVersion)) {
    throw new Error('Source must be a completed readable intelligence run.');
  }

  const readManifest = async () => {
    const [universe, inputs] = await Promise.all([
      source.collection('universe').select('symbol').get(),
      source.collection('preparedInputs').select('symbol', 'calculationVersion').get(),
    ]);

    const symbols = universe.docs.map((doc) => doc.id).sort();

    const inputMap = new Map(inputs.docs.map((doc) => [doc.id, doc]));

    if (
      !symbols.length ||
      symbols.length !== sourceMeta.universeCount ||
      inputs.size !== symbols.length
    ) {
      throw new Error(
        'Source universe or saved inputs are incomplete. No partial publication is allowed.',
      );
    }

    for (const symbol of symbols) {
      documentId(symbol);

      const value = inputMap.get(symbol)?.data();

      if (value?.symbol !== symbol || value.calculationVersion !== sourceMeta.calculationVersion) {
        throw new Error(`Source input missing or incompatible: ${symbol}.`);
      }
    }

    const fingerprint = createHash('sha256')
      .update(
        JSON.stringify(
          [...universe.docs, ...inputs.docs]
            .map((doc) => [doc.ref.path, doc.updateTime?.toMillis(), doc.data()])
            .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
        ),
      )
      .digest('hex');

    return {
      symbols,
      fingerprint,
    };
  };

  const manifest = await readManifest();

  const asOf = options.asOf ?? previous?.asOf ?? new Date().toISOString();

  if (!Number.isFinite(Date.parse(asOf))) {
    throw new Error('Invalid as-of date.');
  }

  const scope = {
    operation: 'saved-input-rebuild',
    rebuildVersion: REBUILD_VERSION,
    calculationVersion: CALCULATION_VERSION,
    analysisVersion: ANALYSIS_VERSION,
    sourceRunId,
    sourceCalculationVersion: sourceMeta.calculationVersion,
    sourceFingerprint: manifest.fingerprint,
    codeHash: options.codeHash,
    asOf,
    universeCount: manifest.symbols.length,
  };

  if (previous && Object.entries(scope).some(([key, value]) => previous[key] !== value)) {
    throw new Error(
      'Resume scope changed (source, code, date or version). Use a new target run ID.',
    );
  }

  if (previous?.activatedAt) {
    if (current !== options.runId) {
      throw new Error('This run was already activated and subsequently replaced.');
    }

    return {
      runId: options.runId,
      count: manifest.symbols.length,
    };
  }

  const owner = randomUUID();

  const expectedActiveRun = previous?.expectedActiveRun ?? current;

  await db.runTransaction(async (tx) => {
    checkInterrupted();

    const [lease, active, existing] = await Promise.all([
      tx.get(leaseRef),
      tx.get(currentRef),
      tx.get(target),
    ]);

    if ((lease.data()?.expiresAt ?? 0) > Date.now()) {
      throw new Error('Another intelligence job owns the lease. Wait for it to finish or expire.');
    }

    if ((active.data()?.activeRun ?? null) !== expectedActiveRun) {
      throw new Error('The active run changed.');
    }

    if (existing.exists !== !!previous || existing.data()?.activatedAt) {
      throw new Error('Target run changed; retry with its current state.');
    }

    tx.set(leaseRef, {
      owner,
      expiresAt: Date.now() + LEASE_MS,
    });

    tx.set(
      target,
      {
        ...scope,
        status: 'recalculating',
        expectedActiveRun,
        startedAt: previous?.startedAt ?? new Date(),
        updatedAt: new Date(),
      },
      {merge: true},
    );
  });

  // Every output commit checks ownership inside the same transaction as its writes.
  const commit = async (write: (tx: Transaction) => void) =>
    db.runTransaction(async (tx) => {
      checkInterrupted();

      const [lease, active] = await Promise.all([tx.get(leaseRef), tx.get(currentRef)]);

      if (lease.data()?.owner !== owner || lease.data()?.expiresAt <= Date.now()) {
        throw new Error('Intelligence lease lost.');
      }

      if ((active.data()?.activeRun ?? null) !== expectedActiveRun) {
        throw new Error('The active run changed.');
      }

      tx.set(leaseRef, {
        owner,
        expiresAt: Date.now() + LEASE_MS,
      });

      write(tx);
    });

  const writeDocuments = async (
    items: {
      ref: DocumentReference;
      data: object;
    }[],
  ) => {
    for (let start = 0; start < items.length; start += 100) {
      await commit((tx) => {
        for (const item of items.slice(start, start + 100)) {
          tx.set(item.ref, plain(item.data));
        }
      });
    }
  };

  try {
    log(
      `Rebuilding ${manifest.symbols.length} stocks: ${sourceRunId} -> ${options.runId}. No FMP requests.`,
    );

    const peersInput: PeerStock[] = [];

    // Stage one freezes regenerated metrics for the entire universe before peer comparisons.
    for (const [index, symbol] of manifest.symbols.entries()) {
      const savedRef = target.collection('preparedInputs').doc(symbol);

      let prepared = (await savedRef.get()).data() as PreparedInput | undefined;

      if (!prepared) {
        const input = (
          await source.collection('preparedInputs').doc(symbol).get()
        ).data() as PreparedInput;

        if (
          input?.symbol !== symbol ||
          input.calculationVersion !== sourceMeta.calculationVersion ||
          input.financials?.symbol !== symbol
        ) {
          throw new Error(`Saved input mismatch for ${symbol}.`);
        }

        const report = recalculatePrepared(
          input,
          null,
          asOf,
          await readSavedSecEvidence(db, symbol),
        );

        prepared = report.normalizedInput;

        const warnings = report.limitations.filter(
          (reason) =>
            ![
              'absolute_scores_only_peers_require_full_universe_recalculation',
              'preview_only_not_publishable',
            ].includes(reason),
        );

        await commit((tx) => {
          tx.set(
            savedRef,
            plain({
              ...prepared,
              rebuildWarnings: warnings,
            }),
          );

          tx.set(
            target.collection('universe').doc(symbol),
            plain({
              symbol,
              ...prepared!.company,
            }),
          );
        });
      }

      if (prepared.symbol !== symbol || prepared.calculationVersion !== CALCULATION_VERSION) {
        throw new Error(`Invalid rebuilt input: ${symbol}.`);
      }

      peersInput.push({
        symbol,
        company: prepared.company,
        metrics: prepared.metrics,
      });

      log(`[Normalize] ${index + 1}/${manifest.symbols.length} ${symbol}`);
    }

    await commit(() => {});

    const peers = buildPeerContexts(peersInput);

    const screeners: Record<string, CalculatedScreenerResult[]> = Object.fromEntries(
      intelligenceCalculators.map((calculator) => [calculator.id, []]),
    );

    // Stage two runs every calculator against the same complete peer universe.
    for (const [index, symbol] of manifest.symbols.entries()) {
      const checkpointRef = target.collection('checkpoints').doc(symbol);

      let checkpoint = (await checkpointRef.get()).data();

      if (
        checkpoint?.calculationVersion !== CALCULATION_VERSION ||
        checkpoint?.analysisVersion !== ANALYSIS_VERSION
      ) {
        const prepared = (
          await target.collection('preparedInputs').doc(symbol).get()
        ).data() as PreparedInput;

        const metrics = {
          ...prepared.metrics,
          peers: peers.get(symbol) ?? {
            metrics: {},
          },
        };

        const input = {
          ...prepared,
          metrics,
        };

        const calculations = Object.fromEntries(
          intelligenceCalculators.map((calculator) => [calculator.id, calculator.calculate(input)]),
        );

        const scorecard = calculateScorecard(symbol, metrics, input.risk, input.financials);

        const analysis = buildPreparedAnalysis({
          symbol,
          company: input.company,
          financials: input.financials,
          metrics,
          estimates: input.estimates,
          thesisData: input.thesisData ?? {
            priceTarget: null,
            rating: null,
            analystEstimates: [],
          },
          scorecard,
        });

        const riskScore = scorecard.scores.risk.score;

        const snapshot = {
          symbol,
          companyName: input.company.companyName || symbol,
          logoUrl: input.risk.logoUrl ?? null,
          riskScore,
          riskLevel:
            riskScore === null ? null : riskScore < 4 ? 'low' : riskScore < 7 ? 'medium' : 'high',
          volatilityScore: scorecard.scores.volatility.score,
        };

        const metadata = {
          symbol,
          sourceRunId: options.runId,
          calculationVersion: CALCULATION_VERSION,
          analysisVersion: ANALYSIS_VERSION,
          calculatedAt: Date.parse(asOf),
          updatedAt: new Date(),
          inputSourceRunId: sourceRunId,
          inputPreparedAt: input.preparedAt,
        };

        const intelligence = {
          ...metadata,
          snapshot,
          calculations,
          metrics,
          estimates: input.estimates,
          risk: input.risk,
          analysis,
        };

        checkpoint = {
          symbol,
          snapshot,
          calculations,
          calculationVersion: CALCULATION_VERSION,
          analysisVersion: ANALYSIS_VERSION,
          completedAt: new Date(),
        };

        const completed = checkpoint;

        await commit((tx) => {
          tx.set(
            target.collection('scorecards').doc(symbol),
            plain({
              ...metadata,
              schemaVersion: CALCULATION_VERSION,
              data: scorecard,
            }),
          );

          tx.set(target.collection('intelligence').doc(symbol), plain(intelligence));

          tx.set(checkpointRef, plain(completed));
        });
      }

      if (
        checkpoint.symbol !== symbol ||
        checkpoint.calculationVersion !== CALCULATION_VERSION ||
        checkpoint.analysisVersion !== ANALYSIS_VERSION
      ) {
        throw new Error(`Invalid checkpoint: ${symbol}.`);
      }

      for (const calculator of intelligenceCalculators) {
        const value = checkpoint.calculations?.[calculator.id];

        if (
          !value ||
          !Number.isFinite(value.score) ||
          !Number.isFinite(value.coverage) ||
          typeof value.eligible !== 'boolean'
        ) {
          throw new Error(`Invalid ${calculator.id} checkpoint for ${symbol}.`);
        }

        screeners[calculator.id].push({
          symbol,
          score: value.score,
          coverage: value.coverage,
          eligible: value.eligible,
          confidence: value.confidence ?? 'low',
        });
      }

      log(`[Calculate] ${index + 1}/${manifest.symbols.length} ${symbol}`);
    }

    const ranking = new ScreenerRankingService();

    for (const calculator of intelligenceCalculators) {
      const ref = target.collection('screeners').doc(calculator.id);

      if ((await ref.get()).data()?.completed === true) {
        continue;
      }

      const ranked = ranking.rank(calculator.id, screeners[calculator.id]);

      await writeDocuments(
        ranked.map((result) => ({
          ref: ref.collection('results').doc(result.symbol),
          data: result,
        })),
      );

      await commit((tx) =>
        tx.set(ref, {
          id: calculator.id,
          resultCount: ranked.length,
          completed: true,
          updatedAt: new Date(),
        }),
      );

      log(`[List] ${calculator.id}: ${ranked.length}`);
    }

    // Verify generation membership, versions, and list counts before the pointer can move.
    for (const name of [
      'universe',
      'preparedInputs',
      'scorecards',
      'intelligence',
      'checkpoints',
    ]) {
      const docs = await target
        .collection(name)
        .select('calculationVersion', 'analysisVersion')
        .get();

      const ids = new Set(
        docs.docs
          .filter((doc) => {
            if (name === 'universe') {
              return true;
            }

            if (doc.data().calculationVersion !== CALCULATION_VERSION) {
              return false;
            }

            return name === 'preparedInputs' || doc.data().analysisVersion === ANALYSIS_VERSION;
          })
          .map((doc) => doc.id),
      );

      if (
        docs.size !== manifest.symbols.length ||
        manifest.symbols.some((symbol) => !ids.has(symbol))
      ) {
        throw new Error(`Incomplete ${name}; run was not activated.`);
      }

      await commit(() => {});
    }

    for (const calculator of intelligenceCalculators) {
      const ref = target.collection('screeners').doc(calculator.id);

      const [meta, results] = await Promise.all([
        ref.get(),
        ref.collection('results').select('rank').get(),
      ]);

      if (!meta.data()?.completed || meta.data()?.resultCount !== results.size) {
        throw new Error(`Incomplete list ${calculator.id}.`);
      }

      await commit(() => {});
    }

    if ((await readManifest()).fingerprint !== manifest.fingerprint) {
      throw new Error('Source changed during rebuilding.');
    }

    await db.runTransaction(async (tx) => {
      checkInterrupted();

      const [lease, active, targetSnapshot] = await Promise.all([
        tx.get(leaseRef),
        tx.get(currentRef),
        tx.get(target),
      ]);

      if (lease.data()?.owner !== owner || lease.data()?.expiresAt <= Date.now()) {
        throw new Error('Intelligence lease lost before activation.');
      }

      if ((active.data()?.activeRun ?? null) !== expectedActiveRun) {
        throw new Error('The active run changed before activation.');
      }

      if (targetSnapshot.data()?.activatedAt) {
        throw new Error('Target run was already activated.');
      }

      const activation = nextActivationState(active.data() ?? {}, options.runId);
      const now = new Date();

      tx.set(
        target,
        {
          status: 'completed',
          completedAt: now,
          activatedAt: now,
          processedCount: manifest.symbols.length,
          activationHealth: 'healthy',
          healthCheckedAt: now,
        },
        {merge: true},
      );

      tx.set(
        currentRef,
        {
          ...activation,
          lastHealthyRun: options.runId,
          activationHealth: 'healthy',
          activatedAt: now,
          healthCheckedAt: now,
        },
        {merge: true},
      );
    });

    log(
      `Activated ${options.runId}: ${manifest.symbols.length} stocks, calculation version ${CALCULATION_VERSION}.`,
    );

    return {
      runId: options.runId,
      count: manifest.symbols.length,
    };
  } finally {
    await db.runTransaction(async (tx) => {
      if ((await tx.get(leaseRef)).data()?.owner === owner) {
        tx.delete(leaseRef);
      }
    });
  }
}
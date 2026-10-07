import 'dotenv/config';
import {applicationDefault, cert, deleteApp, initializeApp} from 'firebase-admin/app';
import {FieldValue, getFirestore} from 'firebase-admin/firestore';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {ANALYSIS_VERSION} from '../intelligence/analysis-version';
import {isReadableCalculationVersion} from '../intelligence/calculation-version';
import {rollbackActivationState} from '../intelligence/run-activation-state';

const {values} = parseArgs({
  options: {
    to: {type: 'string'},
    yes: {type: 'boolean', default: false},
    help: {type: 'boolean', default: false},
  },
  strict: true,
  allowPositionals: false,
});

async function main(): Promise<void> {
  if (values.help) {
    console.log(
      'npx tsx src/scripts/rollbackIntelligence.ts --yes [--to RUN_ID]\nRestores a completed saved intelligence generation. No FMP calls are made.',
    );
    return;
  }

  if (!values.yes) {
    throw new Error('Rollback requires --yes. Run with --help for usage.');
  }

  const app = initializeApp(
    {
      credential: process.env.GOOGLE_APPLICATION_CREDENTIALS
        ? applicationDefault()
        : cert(resolve(process.cwd(), 'src/firebase/firebase-service-account.json')),
    },
    `intelligence-rollback-${randomUUID()}`,
  );

  const db = getFirestore(app);
  const stateRef = db.doc('screenerState/current');

  try {
    const stateSnapshot = await stateRef.get();
    const state = stateSnapshot.data() ?? {};
    const currentRun = typeof state.activeRun === 'string' ? state.activeRun : null;
    const targetRun = values.to ?? (typeof state.previousActiveRun === 'string' ? state.previousActiveRun : null);

    if (!currentRun) throw new Error('There is no active intelligence generation.');
    if (!targetRun) throw new Error('There is no previous intelligence generation to restore.');
    if (targetRun === currentRun) throw new Error('The requested rollback target is already active.');

    const targetRef = db.collection('screenerRuns').doc(targetRun);
    const [target, universe, scorecards, intelligence] = await Promise.all([
      targetRef.get(),
      targetRef.collection('universe').count().get(),
      targetRef.collection('scorecards').count().get(),
      targetRef.collection('intelligence').count().get(),
    ]);
    const data = target.data();
    const expectedCount = data?.universeCount;

    if (
      data?.status !== 'completed' ||
      !isReadableCalculationVersion(data?.calculationVersion) ||
      data?.analysisVersion !== ANALYSIS_VERSION ||
      typeof expectedCount !== 'number' ||
      expectedCount < 1
    ) {
      throw new Error('Rollback target is not a completed readable intelligence generation.');
    }

    const counts = {
      universe: universe.data().count,
      scorecards: scorecards.data().count,
      intelligence: intelligence.data().count,
    };

    if (Object.values(counts).some((count) => count !== expectedCount)) {
      throw new Error(`Rollback target is incomplete: expected ${expectedCount}, received ${JSON.stringify(counts)}.`);
    }

    console.log('Current active run:', currentRun);
    console.log('Rollback target:', targetRun);
    console.log('Target metadata:', {
      calculationVersion: data.calculationVersion,
      analysisVersion: data.analysisVersion,
      universeCount: expectedCount,
    });

    await db.runTransaction(async (tx) => {
      const latest = await tx.get(stateRef);
      const latestState = latest.data() ?? {};

      if (latestState.activeRun !== currentRun) {
        throw new Error(`Active run changed from ${currentRun} to ${String(latestState.activeRun)}. Nothing changed.`);
      }

      const baseState =
        values.to && values.to !== latestState.previousActiveRun
          ? {
              ...latestState,
              previousActiveRun: targetRun,
            }
          : latestState;
      const rollback = rollbackActivationState(baseState, currentRun);

      tx.set(
        stateRef,
        {
          ...rollback,
          lastHealthyRun: targetRun,
          activationHealth: 'manual_rollback',
          rollbackAt: FieldValue.serverTimestamp(),
          rollbackReason: 'manual_known_good_restore',
        },
        {merge: true},
      );
      tx.set(
        db.collection('screenerRuns').doc(currentRun),
        {
          activationHealth: 'manually_rolled_back',
          rolledBackAt: FieldValue.serverTimestamp(),
          rollbackReason: 'manual_known_good_restore',
        },
        {merge: true},
      );
    });

    console.log(`Rollback complete. Active intelligence run is now ${targetRun}.`);
  } finally {
    await deleteApp(app);
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Intelligence rollback failed.');
  process.exitCode = 1;
});
import 'dotenv/config';
import {applicationDefault, cert, deleteApp, initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {randomUUID} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {validateDocumentId} from '../intelligence/audit/audit-runner';
import type {PreparedInput} from '../intelligence/prepared-stock.type';
import {recalculatePrepared} from '../intelligence/recalculate-prepared';
import type {StockIntelligence} from '../intelligence/types';
const {values} = parseArgs({
  options: {
    symbol: {type: 'string'},
    run: {type: 'string'},
    input: {type: 'string'},
    out: {type: 'string'},
    'as-of': {type: 'string'},
    help: {type: 'boolean'},
  },
  strict: true,
  allowPositionals: false,
});
async function main(): Promise<void> {
  if (values.help) {
    console.log(
      'tsx src/scripts/recalculateSavedIntelligence.ts --symbol BTDR [--run RUN_ID] [--out NEW_DIRECTORY] [--as-of ISO_DATE]\nOr use --input BTDR-saved-inputs.json for an offline export. No API calls or Firestore writes.',
    );
    return;
  }
  let input: PreparedInput;
  let previous: StockIntelligence | null;
  let sourceRunId: string | null = null;
  if (values.input) {
    const parsed = JSON.parse(await readFile(resolve(values.input), 'utf8'));
    input = parsed.input ?? parsed;
    previous = parsed.scorecard?.data ?? parsed.scorecard ?? null;
    sourceRunId = parsed.sourceRunId ?? parsed.scorecard?.sourceRunId ?? null;
    if (values.symbol && values.symbol.toUpperCase() !== input.symbol)
      throw new Error('Input symbol differs from --symbol.');
  } else {
    const symbol = validateDocumentId((values.symbol ?? 'BTDR').trim().toUpperCase());
    const app = initializeApp(
      {
        credential: process.env.GOOGLE_APPLICATION_CREDENTIALS
          ? applicationDefault()
          : cert(resolve('src/firebase/firebase-service-account.json')),
      },
      `recalculation-preview-${randomUUID()}`,
    );
    try {
      const db = getFirestore(app);
      sourceRunId = values.run ?? (await db.doc('screenerState/current').get()).data()?.activeRun ?? null;
      if (!sourceRunId) throw new Error('No active run found.');
      const run = db.collection('screenerRuns').doc(validateDocumentId(sourceRunId));
      const metadata = (await run.get()).data();
      if (metadata?.status !== 'completed' || ![2, 3].includes(metadata.calculationVersion))
        throw new Error('A completed version-2-or-3 run is required.');
      const [prepared, card] = await db.getAll(
        run.collection('preparedInputs').doc(symbol),
        run.collection('scorecards').doc(symbol),
      );
      input = prepared.data() as PreparedInput;
      if (!input || input.symbol !== symbol || input.calculationVersion !== metadata.calculationVersion)
        throw new Error('Prepared input is missing or incompatible.');
      const saved = card.data();
      if (
        saved &&
        (saved.symbol !== symbol ||
          saved.sourceRunId !== sourceRunId ||
          saved.calculationVersion !== metadata.calculationVersion)
      )
        throw new Error('Scorecard does not match the frozen run.');
      previous = saved?.data ?? null;
    } finally {
      await deleteApp(app);
    }
  }
  const report = recalculatePrepared(input, previous, values['as-of'] ?? new Date().toISOString());
  const output = resolve(
    values.out ?? `recalculation-output/${validateDocumentId(input.symbol)}-${randomUUID().slice(0, 8)}`,
  );
  await mkdir(resolve(output, '..'), {recursive: true});
  await mkdir(output);
  await writeFile(resolve(output, 'recalculation.json'), JSON.stringify({sourceRunId, ...report}, null, 2), {
    flag: 'wx',
  });
  await writeFile(
    resolve(output, 'saved-inputs.json'),
    JSON.stringify({sourceRunId, input, scorecard: previous}, null, 2),
    {flag: 'wx'},
  );
  console.log(
    `Preview complete: ${output}\nPublished: false. Review recalculation.json and saved-inputs.json. Financial totals are recalculated from retained statements; raw market history and financial reporting basis still require verification.`,
  );
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Recalculation preview failed.');
  process.exitCode = 1;
});
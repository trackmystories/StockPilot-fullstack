import 'dotenv/config';
import {applicationDefault, cert, deleteApp, initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {createHash} from 'node:crypto';
import {readFile, readdir} from 'node:fs/promises';
import {join, resolve, relative} from 'node:path';
import {parseArgs} from 'node:util';
import {rebuildSavedUniverse} from '../intelligence/saved-rebuild';
const {values} = parseArgs({
  options: {
    'source-run': {type: 'string'},
    'run-id': {type: 'string'},
    publish: {type: 'boolean'},
    help: {type: 'boolean'},
  },
  strict: true,
  allowPositionals: false,
});
async function codeHash(): Promise<string> {
  const root = resolve('src/intelligence');
  const paths: string[] = [];
  const walk = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && entry.name.endsWith('.ts')) paths.push(path);
    }
  };
  await walk(root);
  paths.push(resolve('src/scripts/recalculateAllSavedIntelligence.ts'));
  const hash = createHash('sha256');
  for (const path of paths.sort())
    hash
      .update(relative(resolve('src'), path))
      .update('\0')
      .update(await readFile(path))
      .update('\0');
  return hash.digest('hex');
}
async function main(): Promise<void> {
  if (values.help) {
    console.log(
      'npx tsx src/scripts/recalculateAllSavedIntelligence.ts --source-run SOURCE_RUN --run-id NEW_RUN --publish\nRecalculates ALL saved stocks, saves outputs to Firestore, and activates the completed run. No Nest server or FMP calls. Repeat the identical command to resume.',
    );
    return;
  }
  if (!values.publish || !values['run-id'])
    throw new Error('Provide --run-id NEW_RUN and --publish. Use --help for usage.');
  const hash = await codeHash();
  const app = initializeApp(
    {
      credential: process.env.GOOGLE_APPLICATION_CREDENTIALS
        ? applicationDefault()
        : cert(resolve('src/firebase/firebase-service-account.json')),
    },
    'saved-intelligence-rebuild',
  );
  const controller = new AbortController();
  const stop = () => {
    console.log('Stopping after the current Firestore operation...');
    controller.abort();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  try {
    await rebuildSavedUniverse(getFirestore(app), {
      runId: values['run-id'],
      sourceRunId: values['source-run'],
      codeHash: hash,
      signal: controller.signal,
    });
  } finally {
    process.off('SIGINT', stop);
    process.off('SIGTERM', stop);
    await deleteApp(app);
  }
}
void main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Saved-input rebuild failed.');
  console.error(
    'The previous active run is preserved unless activation already completed. Repeat the same command to resume.',
  );
  process.exitCode = 1;
});

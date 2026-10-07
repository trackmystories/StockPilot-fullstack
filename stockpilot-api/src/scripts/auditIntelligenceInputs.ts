import 'dotenv/config';
import {applicationDefault, cert, deleteApp, initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {randomUUID} from 'node:crypto';
import {mkdir, open, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {AuditRunError, runInputAudit, validateDocumentId} from '../intelligence/audit/audit-runner';
const {values} = parseArgs({
  options: {
    run: {type: 'string'},
    symbol: {type: 'string'},
    'audit-id': {type: 'string'},
    'as-of': {type: 'string'},
    out: {type: 'string'},
    write: {type: 'boolean', default: false},
    help: {type: 'boolean', default: false},
  },
  strict: true,
  allowPositionals: false,
});
async function main(): Promise<void> {
  if (values.help) {
    console.log(
      'tsx src/scripts/auditIntelligenceInputs.ts [--symbol BTDR] [--run RUN_ID] [--write --audit-id AUDIT_ID] [--as-of ISO_TIMESTAMP] [--out NEW_DIRECTORY]',
    );
    return;
  }
  const auditId = validateDocumentId(
    values['audit-id'] ?? `audit-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID().slice(0, 8)}`,
  );
  const symbols = values.symbol?.split(',').map((symbol) => validateDocumentId(symbol.trim().toUpperCase()));
  const output = resolve(values.out ?? `audit-output/${auditId}-${randomUUID().slice(0, 8)}`);
  await mkdir(resolve(output, '..'), {recursive: true});
  await mkdir(output); // Refuse to overwrite a previous report directory.
  const reports = await open(resolve(output, 'stocks.jsonl'), 'wx');
  const research = await open(resolve(output, 'research-candidates.jsonl'), 'wx');
  const errors = await open(resolve(output, 'errors.jsonl'), 'wx');
  const app = initializeApp(
    {
      credential: process.env.GOOGLE_APPLICATION_CREDENTIALS
        ? applicationDefault()
        : cert(resolve(process.cwd(), 'src/firebase/firebase-service-account.json')),
    },
    `input-audit-${randomUUID()}`,
  );
  try {
    console.log(
      `Audit: ${auditId}; Firestore writes: ${values.write ? 'audit collection only' : 'disabled'}; reports: ${output}`,
    );
    let count = 0;
    const summary = await runInputAudit(
      getFirestore(app),
      {auditId, runId: values.run, symbols, asOf: values['as-of'], write: Boolean(values.write)},
      {
        stock: async (report, resumed) => {
          await reports.write(`${JSON.stringify(report)}\n`);
          for (const finding of report.findings)
            if (finding.researchCandidate) await research.write(`${JSON.stringify(finding)}\n`);
          console.log(
            `[Audit] ${++count} ${report.symbol}${resumed ? ' (saved audit)' : ''}: ${report.findings.length} findings`,
          );
        },
        error: async (symbol, message) => {
          await errors.write(`${JSON.stringify({symbol, message})}\n`);
          console.error(`[Audit] ${++count} ${symbol}: ${message}`);
        },
      },
    );
    await writeFile(resolve(output, 'summary.json'), JSON.stringify(summary, null, 2), {flag: 'wx'});
    console.log(`Audit ${summary.status}: ${summary.succeeded}/${summary.total} audited; ${summary.failed} failed.`);
    if (summary.failed) process.exitCode = 1;
  } finally {
    await Promise.all([reports.close(), research.close(), errors.close()]);
    await deleteApp(app);
  }
}
void main().catch((error: unknown) => {
  if (error instanceof AuditRunError) console.error(error.message);
  console.error(
    'Audit stopped. Check command arguments, credentials, completed source run and audit scope/lease. Partial JSONL files are not a completed audit. Resume persisted audits with the same --audit-id.',
  );
  process.exitCode = 1;
});
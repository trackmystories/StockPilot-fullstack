import {randomUUID} from 'node:crypto';
import type {Firestore} from 'firebase-admin/firestore';
import type {PreparedInput} from '../prepared-stock.type';
import type {StockIntelligence} from '../types';
import {auditStock} from './audit-stock';
import {AUDIT_VERSION, SUPPORTED_CALCULATION_VERSIONS, type SavedListResult, type StockAudit} from './audit.types';
export class AuditRunError extends Error {}
export type RunAuditOptions = {runId?: string; auditId: string; symbols?: string[]; asOf?: string; write: boolean};
export type AuditSummary = {
  auditId: string;
  sourceRunId: string;
  auditVersion: number;
  sourceCalculationVersion: number;
  asOf: string;
  total: number;
  succeeded: number;
  failed: number;
  findings: number;
  researchCandidates: number;
  reasons: Record<string, number>;
  lists: Record<string, Record<string, number>>;
  status: 'running' | 'completed' | 'completed_with_errors' | 'failed';
};
export type AuditSink = {
  stock: (report: StockAudit, resumed: boolean) => Promise<void>;
  error: (symbol: string, message: string) => Promise<void>;
};
export function validateDocumentId(value: string): string {
  if (!/^[A-Za-z0-9._^-]{1,180}$/.test(value) || value === '.' || value === '..')
    throw new AuditRunError('Invalid document identifier.');
  return value;
}
export function accumulate(summary: AuditSummary, report: StockAudit): void {
  summary.succeeded++;
  summary.findings += report.findings.length;
  for (const finding of report.findings) {
    summary.reasons[finding.reason] = (summary.reasons[finding.reason] ?? 0) + 1;
    if (finding.researchCandidate) summary.researchCandidates++;
  }
  for (const [list, result] of Object.entries(report.lists)) {
    const counts = (summary.lists[list] ??= {});
    counts[result.status] = (counts[result.status] ?? 0) + 1;
  }
}
export async function runInputAudit(db: Firestore, options: RunAuditOptions, sink: AuditSink): Promise<AuditSummary> {
  const audit = db.collection('intelligenceAudits').doc(validateDocumentId(options.auditId));
  const previous = options.write ? (await audit.get()).data() : undefined;
  const runId =
    options.runId ?? previous?.sourceRunId ?? (await db.doc('screenerState/current').get()).data()?.activeRun;
  if (typeof runId !== 'string') throw new AuditRunError('No active run found. Supply --run.');
  const run = db.collection('screenerRuns').doc(validateDocumentId(runId));
  const source = (await run.get()).data();
  if (source?.status !== 'completed' || !SUPPORTED_CALCULATION_VERSIONS.includes(source.calculationVersion))
    throw new AuditRunError('Audit requires a completed calculation-version-2-or-3 run.');
  const universe = await run.collection('universe').select('symbol').get();
  const allSymbols = universe.docs.map((doc) => doc.id).sort();
  if (!allSymbols.length || allSymbols.length !== source.universeCount)
    throw new AuditRunError('Saved universe is incomplete.');
  const requested = options.symbols ?? previous?.symbols ?? allSymbols;
  if (!Array.isArray(requested) || requested.some((symbol) => typeof symbol !== 'string'))
    throw new AuditRunError('Invalid symbol selection.');
  const symbols: string[] = [...new Set<string>(requested)].sort();
  if (!symbols.length || symbols.some((symbol) => !allSymbols.includes(symbol)))
    throw new AuditRunError('Requested symbol is outside the frozen universe.');
  const asOf = options.asOf ?? previous?.asOf ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(asOf))) throw new AuditRunError('Invalid --as-of timestamp.');
  const scope = {
    sourceRunId: runId,
    auditVersion: AUDIT_VERSION,
    sourceCalculationVersion: source.calculationVersion,
    asOf,
    symbols,
  };
  const owner = randomUUID();
  const leaseMs = 15 * 60 * 1000;
  const summary: AuditSummary = {
    auditId: options.auditId,
    sourceRunId: runId,
    auditVersion: AUDIT_VERSION,
    sourceCalculationVersion: source.calculationVersion,
    asOf,
    total: symbols.length,
    succeeded: 0,
    failed: 0,
    findings: 0,
    researchCandidates: 0,
    reasons: {},
    lists: {},
    status: 'running',
  };
  if (options.write)
    await db.runTransaction(async (tx) => {
      const existing = (await tx.get(audit)).data();
      if (
        existing &&
        Object.entries(scope).some(([key, value]) => JSON.stringify(existing[key]) !== JSON.stringify(value))
      )
        throw new AuditRunError(
          'Audit ID belongs to a different run, version, date or symbol selection. Use a new audit ID.',
        );
      if (existing?.leaseOwner && existing.leaseExpiresAt > Date.now())
        throw new AuditRunError(
          'This audit is already running. Wait for its audit lease to expire after a crash; the scoring lease is unrelated.',
        );
      tx.set(
        audit,
        {
          ...scope,
          status: 'running',
          leaseOwner: owner,
          leaseExpiresAt: Date.now() + leaseMs,
          updatedAt: new Date().toISOString(),
        },
        {merge: true},
      );
    });
  const transact = async (write: (tx: FirebaseFirestore.Transaction) => void): Promise<void> => {
    if (!options.write) return;
    await db.runTransaction(async (tx) => {
      const state = (await tx.get(audit)).data();
      if (state?.leaseOwner !== owner || state.leaseExpiresAt <= Date.now())
        throw new AuditRunError('Audit lease expired or changed. Resume using the same audit ID.');
      write(tx);
      tx.set(audit, {leaseExpiresAt: Date.now() + leaseMs, updatedAt: new Date().toISOString()}, {merge: true});
    });
  };
  try {
    for (const symbol of symbols) {
      const resultRef = audit.collection('stocks').doc(symbol);
      const cached = options.write ? ((await resultRef.get()).data() as StockAudit | undefined) : undefined;
      let report: StockAudit;
      if (cached) {
        if (
          cached.sourceRunId !== runId ||
          cached.auditVersion !== AUDIT_VERSION ||
          cached.auditedAsOf !== asOf ||
          cached.symbol !== symbol
        )
          throw new AuditRunError('Stored audit stock does not match the audit scope.');
        report = cached;
      } else {
        try {
          const [inputDoc, cardDoc, checkpointDoc] = await db.getAll(
            run.collection('preparedInputs').doc(symbol),
            run.collection('scorecards').doc(symbol),
            run.collection('checkpoints').doc(symbol),
          );
          const input = inputDoc.data();
          const card = cardDoc.data();
          const checkpoint = checkpointDoc.data();
          if (!input) throw new AuditRunError('Saved prepared input is absent.');
          for (const doc of [input, card, checkpoint])
            if (
              doc &&
              (doc.symbol !== symbol ||
                doc.calculationVersion !== source.calculationVersion ||
                (doc.sourceRunId != null && doc.sourceRunId !== runId))
            )
              throw new AuditRunError('Source symbol, version or run mismatch.');
          report = auditStock(
            input as PreparedInput,
            (card?.data ?? null) as StockIntelligence | null,
            (checkpoint?.calculations ?? {}) as Record<string, SavedListResult>,
            {sourceRunId: runId, asOf},
          );
          if (Buffer.byteLength(JSON.stringify(report)) > 800_000 || report.findings.length > 440)
            throw new AuditRunError(
              'Audit report exceeds the safe per-stock storage budget; split findings before retrying.',
            );
        } catch (error) {
          // Never persist provider/SDK error text: it can contain connection details.
          const message =
            error instanceof Error &&
            /^(Saved prepared|Source symbol|Audit rules|Malformed prepared|Audit report)/.test(error.message)
              ? error.message
              : 'Could not read or audit saved inputs. Inspect source shape, access and connectivity.';
          summary.failed++;
          await transact((tx) =>
            tx.set(audit.collection('errors').doc(symbol), {
              symbol,
              message,
              sourceRunId: runId,
              updatedAt: new Date().toISOString(),
            }),
          );
          await sink.error(symbol, message);
          continue;
        }
        await transact((tx) => {
          tx.set(resultRef, report);
          for (const finding of report.findings) tx.set(audit.collection('findings').doc(finding.id), finding);
          tx.delete(audit.collection('errors').doc(symbol));
        });
      }
      accumulate(summary, report);
      if (cached) await transact(() => {});
      await sink.stock(report, Boolean(cached));
    }
    summary.status = summary.failed ? 'completed_with_errors' : 'completed';
    await transact((tx) => {
      for (const [list, counts] of Object.entries(summary.lists))
        tx.set(audit.collection('lists').doc(list), {
          list,
          counts,
          auditedStocks: summary.succeeded,
          failedStocks: summary.failed,
          sourceRunId: runId,
        });
      tx.set(audit, {...summary, finishedAt: new Date().toISOString(), leaseOwner: null}, {merge: true});
    });
    return summary;
  } catch (error) {
    summary.status = 'failed';
    if (options.write)
      await db
        .runTransaction(async (tx) => {
          const state = (await tx.get(audit)).data();
          if (state?.leaseOwner === owner)
            tx.set(audit, {...summary, leaseOwner: null, leaseExpiresAt: 0}, {merge: true});
        })
        .catch(() => undefined);
    throw error;
  }
}
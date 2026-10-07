import {createHash} from 'node:crypto';
import {screenerConfig} from '../config/screeners.config';
import {numeric} from '../scorecard-metrics';
import type {PreparedInput} from '../prepared-stock.type';
import type {StockIntelligence} from '../types';
import {
  AUDIT_VERSION,
  SUPPORTED_CALCULATION_VERSION,
  SUPPORTED_CALCULATION_VERSIONS,
  type AuditFinding,
  type AuditOptions,
  type AuditReason,
  type EvidenceIssue,
  type SavedListResult,
  type StockAudit,
} from './audit.types';
import {listDependencies, PEER_KEYS, scoreDependencies} from './dependencies';
import {problem} from './evidence-reader';
import {metricEvidence} from './metric-evidence';
const unique = (values: string[]) => [...new Set(values)].sort();
const actions: Record<AuditReason, string> = {
  incomplete_score: 'Inspect the linked input findings. Coverage below 100% is not proof that raw data is missing.',
  score_unavailable: 'Inspect the saved score reasons and linked inputs; the model may be inapplicable or gated.',
  missing_field:
    'Verify the field in the exact-period official filing/profile; retain source, units and accounting basis.',
  missing_period:
    'Locate the required quarterly statement; verify dates and standalone-quarter versus cumulative values.',
  mapping_issue:
    'Review the candidate alias and fix the source mapping if equivalent. Do not commission duplicate research.',
  invalid_value: 'Inspect source values and units; do not coerce malformed observations into zero.',
  period_mismatch: 'Align periods before calculating. Do not substitute a different quarter.',
  currency_mismatch: 'Verify currencies and conversion rules before combining values.',
  not_applicable:
    'Review the calculator treatment of this observed condition; no replacement value should be invented.',
  stale_input: 'Refresh the affected source separately; preserve this historical audit.',
  insufficient_peers: 'Use the documented absolute-score fallback; do not fabricate peers.',
  provenance_unavailable:
    'Inspect the saved raw response/cache or request additional source evidence. Cause is unconfirmed.',
  calculation_gap:
    'Compare the saved metric and normalizer; investigate version/mapping differences before changing data.',
};
export function auditStock(
  prepared: PreparedInput,
  scorecard: StockIntelligence | null,
  calculations: Record<string, SavedListResult>,
  options: AuditOptions,
): StockAudit {
  if (!SUPPORTED_CALCULATION_VERSIONS.includes(prepared.calculationVersion))
    throw new Error(
      `Audit rules support calculation version ${SUPPORTED_CALCULATION_VERSION} or 3, received ${prepared.calculationVersion}.`,
    );
  if (!Number.isFinite(Date.parse(options.asOf))) throw new Error('Invalid audit as-of timestamp.');
  if (
    !prepared.metrics ||
    !prepared.company ||
    !prepared.financials ||
    !['income', 'balanceSheet', 'cashFlow'].every((key) =>
      Array.isArray((prepared.financials as unknown as Record<string, unknown>)[key]),
    )
  )
    throw new Error('Malformed prepared input.');
  // Saved scorecard metrics retain the peer context used by the completed run.
  const input = {...prepared, metrics: {...prepared.metrics, ...(scorecard?.metrics ?? {})}};
  const scores = scoreDependencies(input);
  const lists = listDependencies();
  const registry = metricEvidence(input);
  const findings = new Map<string, AuditFinding>();
  const byMetric: StockAudit['metrics'] = {};
  const add = (issue: EvidenceIssue, metric: string, blocks = true): string => {
    const id = createHash('sha256')
      .update(JSON.stringify([input.symbol, issue.reason, issue.path, issue.field, issue.period, issue.detail]))
      .digest('hex')
      .slice(0, 32);
    const affectedScores = Object.keys(scores).filter((key) => scores[key].includes(metric));
    const affectedLists = Object.keys(lists).filter((key) => lists[key].includes(metric));
    const existing = findings.get(id);
    if (existing) {
      existing.affectedMetrics = unique([...existing.affectedMetrics, metric]);
      existing.affectedScores = unique([...existing.affectedScores, ...affectedScores]);
      existing.affectedLists = unique([...existing.affectedLists, ...affectedLists]);
      existing.blocksAuditReadiness ||= blocks;
    } else
      findings.set(id, {
        ...issue,
        id,
        symbol: input.symbol,
        sourceRunId: options.sourceRunId,
        affectedMetrics: [metric],
        affectedScores,
        affectedLists,
        blocksAuditReadiness: blocks,
        researchCandidate:
          ['missing_field', 'missing_period'].includes(issue.reason) && issue.path.startsWith('financials.'),
        suggestedAction: actions[issue.reason],
      });
    return id;
  };
  for (const [key, trace] of Object.entries(registry)) {
    const path = key.split('.');
    const stored =
      path.length === 1
        ? (input.metrics as unknown as Record<string, unknown>)[key]
        : (input[path[0] as keyof PreparedInput] as unknown as Record<string, unknown> | null)?.[path[1]];
    const profile = key.startsWith('company.');
    const value = profile ? trace.value : numeric(stored);
    const ids = trace.issues.map((issue) => add(issue, key));
    if (!profile && !trace.issues.length && trace.value !== null) {
      // Market inputs derived from saved values cannot be independently reproduced here.
      if (value === null || Math.abs(value - trace.value) > Math.max(0.0001, Math.abs(trace.value) * 0.00001)) {
        ids.push(
          add(
            problem(
              'calculation_gap',
              `metrics.${key}`,
              key,
              input.metrics.dataQuality?.asOf ?? 'unknown',
              `Saved value differs from the diagnostic derivation (${trace.value}). Audit does not replace it.`,
              stored,
            ).issues[0],
            key,
          ),
        );
      }
    }
    byMetric[key] = {value, findingIds: unique(ids)};
  }
  // Validate retained statement structure independently of individual derived values.
  for (const [name, rows] of Object.entries(input.financials)) {
    if (!Array.isArray(rows)) continue;
    const seen = new Set<string>();
    for (const row of rows as Record<string, unknown>[]) {
      if (!row || typeof row !== 'object') throw new Error(`Invalid ${name} statement row.`);
      const date = String(row.date ?? '');
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
        !Number.isFinite(Date.parse(date)) ||
        new Date(date).toISOString().slice(0, 10) !== date ||
        seen.has(date)
      ) {
        const id = add(
          problem(
            'invalid_value',
            `financials.${name}`,
            'date',
            date || 'unknown',
            'Malformed or duplicate statement date; comparison chronology is not reliable.',
            date,
          ).issues[0],
          'statementStructure',
        );
        const finding = findings.get(id)!;
        finding.affectedScores = Object.keys(scores).filter((key) => !['momentum', 'volatility'].includes(key));
        finding.affectedLists = Object.keys(lists).filter((key) => !isMarketOnly(key));
      }
      seen.add(date);
    }
  }
  for (const [field, maximum, affectedScores, affectedLists] of [
    [
      'asOf',
      200,
      Object.keys(scores).filter((key) => !['momentum', 'volatility'].includes(key)),
      Object.keys(lists).filter((key) => !isMarketOnly(key)),
    ],
    [
      'priceAsOf',
      10,
      [
        'momentum',
        'volatility',
        'risk',
        'valuation',
        'recovery',
        'conviction',
        'breakoutReadiness',
        'valuationCompressionRisk',
        'reratingPotential',
      ],
      Object.keys(lists),
    ],
  ] as const) {
    const date = input.metrics.dataQuality?.[field];
    const age = date ? (Date.parse(options.asOf) - Date.parse(date)) / 86400000 : NaN;
    if (!Number.isFinite(age) || age < 0 || age > maximum) {
      const issue = problem(
        Number.isFinite(age) && age >= 0 ? 'stale_input' : 'invalid_value',
        `metrics.dataQuality.${field}`,
        field,
        date ?? 'unknown',
        `Evidence must be dated, not in the future, and at most ${maximum} days old at the audit as-of time.`,
        Number.isFinite(age) ? age : null,
      ).issues[0];
      const id = add(issue, field);
      findings.get(id)!.affectedScores = [...affectedScores];
      findings.get(id)!.affectedLists = [...affectedLists];
    }
  }
  // Missing optional peers do not invalidate the absolute-score fallback.
  for (const key of PEER_KEYS) {
    if (
      byMetric[key]?.value !== null &&
      byMetric[key]?.value !== undefined &&
      !input.metrics.peers?.metrics[key as keyof typeof input.metrics]
    ) {
      add(
        problem(
          'insufficient_peers',
          `metrics.peers.${key}`,
          key,
          'frozen source run',
          'No saved eligible peer comparison. The current model permits an absolute-only fallback; absence does not prove why peers were unavailable.',
        ).issues[0],
        key,
        false,
      );
    }
  }
  const affected = (kind: 'affectedScores' | 'affectedLists', key: string) =>
    [...findings.values()].filter((f) => f[kind].includes(key));
  const scoreReports: StockAudit['scores'] = {};
  for (const key of Object.keys(scores)) {
    const saved = scorecard?.scores?.[key as keyof typeof scorecard.scores];
    if (
      !saved ||
      saved.score === null ||
      saved.coverage < 1 ||
      Object.values(saved.components ?? {}).some((c) => c.score === null || (c.coverage ?? 1) < 1)
    ) {
      const id = add(
        problem(
          !saved || saved.score === null ? 'score_unavailable' : 'incomplete_score',
          `scorecard.scores.${key}`,
          key,
          'saved output',
          'Saved assessment is unavailable or incomplete. This is a score-level consequence, not an additional missing financial field.',
        ).issues[0],
        `score.${key}`,
      );
      findings.get(id)!.affectedScores = [key];
    }
    const related = affected('affectedScores', key);
    scoreReports[key] = {
      savedScore: saved?.score ?? null,
      savedCoverage: saved?.coverage ?? null,
      evidence: related.some((f) => f.blocksAuditReadiness) ? 'incomplete' : 'complete',
      findingIds: related.map((f) => f.id),
    };
  }
  const listReports: StockAudit['lists'] = {};
  for (const [id] of Object.entries(lists)) {
    const config = screenerConfig[id];
    if (!config) throw new Error(`Missing screener configuration for ${id}.`);
    const saved = calculations[id];
    const related = affected('affectedLists', id);
    const scope = outOfScope(id, input);
    const productionQualified =
      saved && typeof saved.eligible === 'boolean' && Number.isFinite(saved.score) && Number.isFinite(saved.coverage)
        ? saved.eligible && saved.score >= config.minimumScore && saved.coverage >= config.minimumCoverage
        : null;
    const incomplete = related.some((f) => f.blocksAuditReadiness) || (saved !== undefined && saved.coverage < 100);
    const status = scope
      ? 'not_applicable'
      : incomplete
        ? 'insufficient_evidence'
        : productionQualified === null
          ? 'not_evaluated'
          : productionQualified
            ? 'qualified'
            : 'did_not_qualify';
    listReports[id] = {
      status,
      productionQualified,
      savedScore: saved?.score ?? null,
      savedCoverage: saved?.coverage ?? null,
      reasons: unique([
        ...(saved?.reasons ?? []),
        ...(scope ? [scope] : []),
        ...(incomplete ? ['audit_requires_all_applicable_inputs'] : []),
        ...(productionQualified === null ? ['saved_list_output_unavailable'] : []),
      ]),
      findingIds: related.map((f) => f.id),
    };
  }
  return {
    symbol: input.symbol,
    sourceRunId: options.sourceRunId,
    auditVersion: AUDIT_VERSION,
    sourceCalculationVersion: input.calculationVersion,
    sourcePreparedAt: input.preparedAt,
    auditedAsOf: options.asOf,
    metrics: byMetric,
    scores: scoreReports,
    lists: listReports,
    findings: [...findings.values()].sort((a, b) => a.id.localeCompare(b.id)),
    limitations: [
      'Strict audit readiness requires every applicable registered input. It is a review policy, not a change to production eligibility or weights.',
      'Qualified means passes saved production gates/thresholds with complete audited evidence, before resultLimit ranking. It does not certify list membership or investment quality.',
      'Research candidates are proposals only; verify exact fiscal period, currency, units, accounting basis and whether an official disclosure exists.',
      'The saved snapshot does not retain complete raw price history or all raw quote/estimate responses. Those sources cannot be independently validated by this audit.',
      'Accounting restatements, currency conversion, split adjustments, and cumulative-versus-standalone quarters require external reconciliation; this audit does not certify them.',
    ],
  };
}
function isMarketOnly(id: string): boolean {
  return id.startsWith('theme-') || id === 'low-cap-ai' || id === 'strong-momentum';
}
function outOfScope(id: string, input: PreparedInput): string | null {
  if (!isMarketOnly(id) && /financial|real estate/i.test(input.company.sector ?? ''))
    return 'sector_model_not_supported';
  if (id.startsWith('small-cap-') || id.startsWith('low-cap-')) {
    if (input.company.currency && input.company.currency !== 'USD') return 'usd_market_cap_required';
    const cap = input.company.marketCap;
    if (
      typeof cap === 'number' &&
      Number.isFinite(cap) &&
      (cap < (id.startsWith('low-cap-') ? 1 : 300_000_000) || cap > 2_000_000_000)
    )
      return 'outside_market_cap_scope';
  }
  return null;
}
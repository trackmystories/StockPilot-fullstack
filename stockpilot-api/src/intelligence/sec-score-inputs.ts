import type {Firestore} from 'firebase-admin/firestore';
import {LAYER_NAMES, type Evidence} from '../sec-research/sec-research.types';
import {validEvidence} from '../reports/report-evidence';
import type {StockIntelligenceMetrics} from './types';

export type SavedSecEvidence = {
  cik: string | null;
  fingerprint: string | null;
  evidence: Evidence[];
};

// Firestore only. This module has no ingestion service or HTTP client.
export async function readSavedSecEvidence(
  db: Firestore,
  symbol: string,
): Promise<SavedSecEvidence> {
  return db.runTransaction(async (tx) => {
    const mapping = await tx.get(db.collection('secResearchSymbols').doc(symbol));
    const cik = mapping.get('cik');
    if (typeof cik !== 'string' || !/^\d{10}$/.test(cik)) {
      return {cik: null, fingerprint: null, evidence: []};
    }
    const ref = db.collection('secResearchCompanies').doc(cik);
    const [metadata, ...layers] = await tx.getAll(
      ref,
      ...LAYER_NAMES.map((name) => ref.collection('layers').doc(name)),
    );
    return {
      cik,
      fingerprint:
        typeof metadata.get('fingerprint') === 'string' ? metadata.get('fingerprint') : null,
      evidence: metadata.exists
        ? layers.flatMap((layer) => {
            const items = layer.get('evidence');
            return Array.isArray(items) ? (items as Evidence[]) : [];
          })
        : [],
    };
  });
}

function dateCell(value: string): string | null {
  const cleaned = value.trim();
  if (!/^(?:\d{4}-\d{2}-\d{2}|[A-Za-z]+ \d{1,2},? \d{4}|\d{1,2}-[A-Za-z]{3}-\d{4})$/.test(cleaned))
    return null;
  const date = Date.parse(/^\d{4}-/.test(cleaned) ? `${cleaned}T00:00:00Z` : `${cleaned} UTC`);
  return Number.isFinite(date) ? new Date(date).toISOString().slice(0, 10) : null;
}

function amount(value: string): number | null {
  if (!/^(?:-?\d[\d,]*(?:\.\d+)?|\(\d[\d,]*(?:\.\d+)?\))$/.test(value)) return null;
  const result = Number(value.replace(/[(),]/g, '')) * (value.startsWith('(') ? -1 : 1);
  return Number.isFinite(result) ? result : null;
}

export function supplementSecMetrics(
  metrics: StockIntelligenceMetrics,
  saved: SavedSecEvidence,
  asOf: string,
): void {
  const supplement: NonNullable<StockIntelligenceMetrics['secSupplement']> = {
    fingerprint: saved.fingerprint,
    status: saved.cik ? 'no_compatible_facts' : 'not_prepared',
    facts: [],
  };
  metrics.secSupplement = supplement;
  const period = metrics.dataQuality?.asOf;
  const currency = metrics.dataQuality?.reportedCurrency;
  if (!period || currency !== 'USD') return;

  type Metric = 'currentRatio' | 'debtToEquity' | 'cashToShortTermDebt';
  const definitions: Array<{metric: Metric; top: string[]; bottom: string[]}> = [
    {metric: 'currentRatio', top: ['total current assets'], bottom: ['total current liabilities']},
    {
      metric: 'debtToEquity',
      top: ['total debt'],
      bottom: ["total stockholders' equity", "total shareholders' equity"],
    },
    {
      metric: 'cashToShortTermDebt',
      top: ['cash and short-term investments'],
      bottom: ['short-term debt and current portion of long-term debt'],
    },
  ];
  const candidates = new Map<Metric, typeof supplement.facts>();
  const seen = new Set<string>();
  for (const item of saved.evidence) {
    if (
      !validEvidence(item) ||
      item.source.cik !== saved.cik ||
      !item.table ||
      !['10-K', '10-Q', '20-F', '40-F'].includes(item.source.form) ||
      item.source.reportDate !== period ||
      Date.parse(item.source.filedAt) > Date.parse(asOf)
    )
      continue;
    const identity = `${item.source.accession}:${item.id}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    const text = `${item.context}\n${item.section}\n${item.table}`;
    if (
      !/consolidated balance sheets?|consolidated statements? of financial position/i.test(text) ||
      /parent.only|parent.company.only|pro.forma|segment|unaudited.pro.forma/i.test(text) ||
      !/(?:US\s*\$|USD|U\.S\. dollars)\s*(?:in\s+)?(?:thousands|millions|billions)/i.test(text)
    )
      continue;
    if (/\b(?:EUR|GBP|RMB|CNY|CAD|AUD|JPY)\b|HK\$/i.test(text)) continue;
    // All values must share an explicitly dated column and the same table units.
    const rows = item.table.split('\n').map((row) =>
      row
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => cell && cell !== '$'),
    );
    const headers = rows
      .map((row) => row.map(dateCell).filter((date): date is string => date !== null))
      .filter((dates) => dates.length >= 1 && dates.includes(period));
    if (headers.length !== 1 || new Set(headers[0]).size !== headers[0].length) continue;
    const dates = headers[0];
    const column = dates.indexOf(period);
    const rowValue = (labels: string[]): number | null => {
      const matched = rows.filter((row) =>
        labels.includes(row[0].toLowerCase().replace(/[’]/g, "'").replace(/:$/, '')),
      );
      if (matched.length !== 1 || matched[0].length !== dates.length + 1) return null;
      const values = matched[0].slice(1).map(amount);
      return values.every((value) => value !== null) ? values[column] : null;
    };
    for (const definition of definitions) {
      if (metrics[definition.metric] !== null) continue;
      const numerator = rowValue(definition.top);
      const denominator = rowValue(definition.bottom);
      if (numerator === null || numerator < 0 || denominator === null || denominator <= 0) continue;
      const value = numerator / denominator;
      if (!Number.isFinite(value)) continue;
      const fact = {
        metric: definition.metric,
        value,
        asOf: period,
        numerator,
        denominator,
        evidenceId: item.id,
        url: item.source.url,
        accession: item.source.accession,
        filedAt: item.source.filedAt,
      };
      candidates.set(definition.metric, [...(candidates.get(definition.metric) ?? []), fact]);
    }
  }
  for (const [metric, facts] of candidates) {
    // Conflicting saved filings are withheld instead of silently choosing one.
    if (facts.some((fact) => Math.abs(fact.value - facts[0].value) > 0.000001)) continue;
    const fact = facts.sort((a, b) => b.filedAt.localeCompare(a.filedAt))[0];
    metrics[metric] = fact.value;
    // A previous peer percentile did not include this newly recovered metric.
    if (metrics.peers) delete metrics.peers.metrics[metric];
    supplement.facts.push(fact);
  }
  if (supplement.facts.length) supplement.status = 'used';
}

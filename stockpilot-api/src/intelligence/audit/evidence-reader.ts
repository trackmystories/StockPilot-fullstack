import {numeric, ordered} from '../scorecard-metrics';
import type {PreparedInput} from '../prepared-stock.type';
import type {AuditReason, EvidenceIssue, Trace} from './audit.types';
type Row = Record<string, unknown>;
export type Statement = 'income' | 'balanceSheet' | 'cashFlow';
export const known = (value: number): Trace => ({value, issues: []});
export function problem(
  reason: AuditReason,
  path: string,
  field: string,
  period: string,
  detail: string,
  observed: unknown = null,
  currency: string | null = null,
): Trace {
  return {
    value: null,
    issues: [
      {
        reason,
        path,
        field,
        period,
        observed:
          typeof observed === 'number' && Number.isFinite(observed)
            ? observed
            : observed == null
              ? null
              : String(observed).slice(0, 120),
        currency,
        detail,
      },
    ],
  };
}
export function combine(values: Trace[], formula: (...values: number[]) => number): Trace {
  const issues = values.flatMap((value) => value.issues);
  if (issues.length || values.some((value) => value.value === null)) return {value: null, issues};
  const value = formula(...values.map((value) => value.value!));
  return Number.isFinite(value)
    ? known(value)
    : problem('invalid_value', 'derived', 'arithmetic', 'matched inputs', 'Derived value is not finite.');
}
export function positive(value: Trace, name: string): Trace {
  return value.value !== null && value.value <= 0
    ? problem(
        'not_applicable',
        `derived.${name}`,
        name,
        'matched inputs',
        'This formula requires a strictly positive value; zero/negative evidence is present.',
        value.value,
      )
    : value;
}
export const divide = (a: Trace, b: Trace, name: string, scale = 1): Trace =>
  combine([a, positive(b, name)], (x, y) => (scale * x) / y);
export const subtract = (a: Trace, b: Trace): Trace => combine([a, b], (x, y) => x - y);
export const growth = (a: Trace, b: Trace, name: string): Trace => divide(subtract(a, b), b, name, 100);
// Candidate aliases are reported for review, never silently substituted in production.
const CANDIDATES: Record<string, string[]> = {
  grossProfit: ['grossProfitLoss'],
  totalStockholdersEquity: ['totalShareholdersEquity', 'stockholdersEquity'],
  capitalExpenditure: ['capitalExpenditures'],
  weightedAverageShsOutDil: ['weightedAverageSharesDiluted'],
  netCommonStockIssuance: ['netStockIssuance'],
  incomeBeforeTax: ['incomeBeforeIncomeTaxes'],
};
export class EvidenceReader {
  readonly rows: Record<Statement, Row[]>;
  readonly latestDate: string | null;
  constructor(readonly input: PreparedInput) {
    this.rows = {
      income: ordered(input.financials.income),
      balanceSheet: ordered(input.financials.balanceSheet),
      cashFlow: ordered(input.financials.cashFlow),
    };
    this.latestDate = typeof this.rows.income[0]?.date === 'string' ? this.rows.income[0].date : null;
  }
  quarters(statement: Statement, count: number, align = true): EvidenceIssue[] {
    const rows = this.rows[statement];
    const path = `financials.${statement}`;
    const issues: EvidenceIssue[] = [];
    const add = (reason: AuditReason, detail: string, observed: unknown = null) =>
      issues.push(
        ...problem(
          reason,
          path,
          'reportingPeriods',
          `latest ${count} consecutive quarters ending ${this.latestDate ?? 'unknown'}`,
          detail,
          observed,
        ).issues,
      );
    if (rows.length < count)
      add('missing_period', `Need ${count} quarters; only ${rows.length} dated rows are retained.`);
    const period = rows.slice(0, count);
    if (period.some((row) => row.period === 'FY'))
      add('period_mismatch', 'An annual statement appears where quarterly observations are required.');
    if (align && statement !== 'income' && rows.length && rows[0].date !== this.latestDate)
      add('period_mismatch', 'Latest statement date differs from the latest income statement.', rows[0].date);
    for (let i = 1; i < period.length; i++) {
      const gap = (Date.parse(String(period[i - 1].date)) - Date.parse(String(period[i].date))) / 86400000;
      if (gap > 120)
        add(
          'missing_period',
          `Quarter gap between ${period[i].date} and ${period[i - 1].date}; do not use positional year-over-year comparisons.`,
        );
      else if (gap < 60) add('period_mismatch', 'Overlapping or non-quarterly statement periods.');
    }
    const currencies = period.map((row) => row.reportedCurrency).filter((value) => typeof value === 'string');
    // Match the current normalizer's cross-statement alignment requirement.
    if (align && statement !== 'income')
      for (const group of Object.values(this.rows))
        if (typeof group[0]?.reportedCurrency === 'string') currencies.push(group[0].reportedCurrency);
    if (new Set(currencies).size > 1) add('currency_mismatch', 'Statement inputs have different reported currencies.');
    if (period.some((row) => typeof row.reportedCurrency !== 'string' || !row.reportedCurrency.trim()))
      add('currency_mismatch', 'Reported currency is absent; numerical compatibility cannot be verified.');
    return issues;
  }
  field(statement: Statement, index: number, aliases: string[]): Trace {
    const row = this.rows[statement][index];
    const period =
      typeof row?.date === 'string' ? row.date : `quarter offset ${index} from ${this.latestDate ?? 'unknown'}`;
    const path = `financials.${statement}[${period}]`;
    const currency = typeof row?.reportedCurrency === 'string' ? row.reportedCurrency : null;
    if (!row) return problem('missing_period', path, aliases[0], period, 'Required dated statement is absent.');
    if (aliases[0] === 'freeCashFlow') {
      const supplied = numeric(row.freeCashFlow);
      const ocf = numeric(row.operatingCashFlow) ?? numeric(row.netCashProvidedByOperatingActivities);
      const capex = numeric(row.capitalExpenditure);
      if (supplied !== null && ocf !== null && capex !== null) {
        const derived = ocf - Math.abs(capex);
        if (Math.abs(supplied - derived) > Math.max(1, Math.abs(derived) * 0.000001))
          return problem(
            'invalid_value',
            path,
            'freeCashFlow',
            period,
            'Reported FCF conflicts with operating cash flow minus absolute capex. Verify source definitions and reporting periods before use.',
            supplied,
            currency,
          );
      }
    }
    for (const key of aliases) {
      const value = numeric(row[key]);
      if (value !== null) return known(value);
    }
    if (aliases[0] === 'freeCashFlow') {
      return combine(
        [
          this.field(statement, index, ['operatingCashFlow', 'netCashProvidedByOperatingActivities']),
          this.field(statement, index, ['capitalExpenditure']),
        ],
        (ocf, capex) => ocf - Math.abs(capex),
      );
    }
    const candidate = (CANDIDATES[aliases[0]] ?? []).find((key) => numeric(row[key]) !== null);
    if (candidate)
      return problem(
        'mapping_issue',
        path,
        aliases[0],
        period,
        `Candidate field ${candidate} exists. Verify accounting meaning and units before mapping.`,
        row[candidate],
        currency,
      );
    const invalid = aliases.find((key) => row[key] != null && row[key] !== '');
    return problem(
      invalid ? 'invalid_value' : 'missing_field',
      path,
      aliases[0],
      period,
      `Required accepted field: ${aliases.join(' or ')}. Units must match the saved statement; no automatic unit conversion.`,
      invalid ? row[invalid] : null,
      currency,
    );
  }
  point(statement: Statement, index: number, ...aliases: string[]): Trace {
    const issues = this.quarters(statement, index + 1);
    return issues.length ? {value: null, issues} : this.field(statement, index, aliases);
  }
  series(
    statement: Statement,
    start: number,
    count: number,
    aliases: string[],
    formula: (...values: number[]) => number,
  ): Trace {
    const issues = this.quarters(statement, start + count);
    if (issues.length) return {value: null, issues};
    return combine(
      Array.from({length: count}, (_, index) => this.field(statement, start + index, aliases)),
      formula,
    );
  }
  sum(statement: Statement, key: string, start = 0, ...aliases: string[]): Trace {
    return this.series(statement, start, 4, [key, ...aliases], (...values) => values.reduce((a, b) => a + b, 0));
  }
  saved(section: 'metrics' | 'estimates' | 'momentum' | 'risk', key: string): Trace {
    const data = this.input[section] as unknown as Row | null;
    const value = numeric(data?.[key]);
    return value !== null
      ? known(value)
      : problem(
          'provenance_unavailable',
          `${section}.${key}`,
          key,
          'saved observation',
          'Derived/market input is unavailable. Its complete raw response/history is not retained here; inspect the response cache or source feed before diagnosing a missing filing field.',
        );
  }
}

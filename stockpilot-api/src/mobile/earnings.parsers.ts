type Row = Record<string, unknown>;

const obj = (value: unknown): Row =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};

const num = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) ? value : null);

const currency = (value: unknown): string | null =>
  typeof value === 'string' && /^[A-Z]{3}$/.test(value) ? value : null;

const date = (value: unknown): string | null => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = Date.parse(value);

  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value ? value : null;
};

function statementRows(payload: unknown, symbol: string) {
  if (!Array.isArray(payload)) {
    throw new Error('Invalid FMP quarterly statement response.');
  }

  return payload
    .map(obj)
    .filter(
      (row) => row.symbol === symbol && date(row.date) && typeof row.period === 'string' && /^Q[1-4]$/.test(row.period),
    )
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function parseStatements(payload: unknown, symbol: string) {
  const rows = statementRows(payload, symbol);
  const latest = rows[0];

  if (!latest || (num(latest.revenue) === null && num(latest.epsDiluted) === null && num(latest.eps) === null)) {
    throw new Error('No quarterly results available.');
  }

  const year = Number(latest.fiscalYear);

  // Match fiscal quarters, including 52/53-week calendars.
  const previous = rows.find(
    (row) => Number.isFinite(year) && row.period === latest.period && Number(row.fiscalYear) === year - 1,
  );

  const revenue = num(latest.revenue);
  const priorRevenue = num(previous?.revenue);

  const sameCurrency =
    currency(latest.reportedCurrency) !== null &&
    currency(latest.reportedCurrency) === currency(previous?.reportedCurrency);

  const diluted = num(latest.epsDiluted);

  return {
    periodEnd: String(latest.date),
    currency: currency(latest.reportedCurrency),
    revenue,
    revenueGrowth:
      sameCurrency && revenue !== null && priorRevenue !== null && priorRevenue > 0
        ? (revenue / priorRevenue - 1) * 100
        : null,
    eps: diluted ?? num(latest.eps),
    epsBasis: diluted !== null ? 'Diluted EPS (provider statement)' : 'Basic EPS (provider statement)',
    reportedDate: null,
    adjustedEps: null,
  };
}

export function parseEstimates(payload: unknown, symbol: string, periodEnd: string | null, now: number) {
  if (!Array.isArray(payload)) {
    throw new Error('Invalid FMP estimate response.');
  }

  const rows = payload.map(obj).filter((row) => row.symbol === symbol && date(row.date));

  const cutoff = periodEnd ? Date.parse(periodEnd) + 45 * 86400000 : now;

  const next = rows
    .filter(
      (row) => Date.parse(String(row.date)) > cutoff && (num(row.epsAvg) !== null || num(row.revenueAvg) !== null),
    )
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))[0];

  return {
    period: next ? `Quarter ending ${next.date}` : null,
    eps: num(next?.epsAvg),
    revenue: num(next?.revenueAvg),
    epsGrowth: null,
    revenueGrowth: null,
    epsCurrency: currency(next?.currency),
    revenueCurrency: currency(next?.currency),
    nextEarningsDate: null,
  };
}

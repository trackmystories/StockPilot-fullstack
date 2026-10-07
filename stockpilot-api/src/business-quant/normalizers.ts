import {STATEMENT_FIELDS} from './statement-fields';
export type Row = Record<string, unknown>;
export const object = (value: unknown): Row => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
export function number(value: unknown): number | null {
  if ((typeof value !== 'number' && typeof value !== 'string') || (typeof value === 'string' && !value.trim())) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
export const text = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
export function dateOnly(value: unknown): string | null {
  const valueText = text(value)?.slice(0, 10);
  if (!valueText || !/^\d{4}-\d{2}-\d{2}$/.test(valueText)) return null;
  const milliseconds = Date.parse(valueText);
  return Number.isFinite(milliseconds) && new Date(milliseconds).toISOString().slice(0, 10) === valueText ? valueText : null;
}
const slug = (value: unknown): string => (text(value) ?? '').toLowerCase().replace(/\s*\((?:annual|quarter|qtr|ttm|yr)\)\s*$/i, '').replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export function normalizeStatements(payload: unknown, symbol: string, statement: string, frequency: string, fiscalYearEnd?: string): Row[] {
  const envelope = object(payload);
  const metadata = object(envelope.metadata);
  if (text(metadata.ticker)?.toUpperCase() !== symbol || !envelope.data || typeof envelope.data !== 'object' || Array.isArray(envelope.data)) throw new Error(`Invalid Business Quant ${statement} statement for ${symbol}.`);
  const fields = STATEMENT_FIELDS[statement];
  if (!fields) throw new Error(`Unsupported statement ${statement}.`);
  const entries = new Map<string, Map<string, {value: number | null; datatype: string | null}>>();
  const seenDates = new Set<string>();
  const collect = (node: unknown): void => {
    const item = object(node);
    if (Array.isArray(item.values)) {
      const meta = object(item.metadata);
      const keys = [slug(meta.slug), slug(meta.name)].filter(Boolean);
      for (const raw of item.values) {
        const point = object(raw);
        const day = dateOnly(point.date); // normalizedDate is NOT the issuer's reported period end.
        if (!day) continue;
        const periodType = text(point.periodType)?.toLowerCase();
        if (periodType && periodType !== (frequency === 'annual' ? 'annual' : 'quarter')) continue;
        seenDates.add(day);
        for (const key of keys) {
          const series = entries.get(key) ?? new Map();
          const value = number(object(point.reportedValue).raw);
          const previous = series.get(day);
          if (previous && previous.value !== value) throw new Error(`Conflicting ${key} observations for ${symbol} ${day}.`);
          series.set(day, {value, datatype: text(meta.datatype)});
          entries.set(key, series);
        }
      }
      return;
    }
    for (const [key, child] of Object.entries(item)) if (key !== 'metadata') collect(child);
  };
  collect(envelope.data);
  const currency = text(metadata.currency);
  const endMonth = /^\d{4}$/.test(fiscalYearEnd ?? '') ? Number(fiscalYearEnd!.slice(0, 2)) : null;
  return [...seenDates].sort().reverse().map((day) => {
    const month = Number(day.slice(5, 7));
    const year = Number(day.slice(0, 4));
    const knownFiscalCalendar = endMonth !== null && endMonth >= 1 && endMonth <= 12;
    const quarter = knownFiscalCalendar ? Math.ceil((((month - endMonth! + 11) % 12) + 1) / 3) : null;
    const row: Row = {symbol, date: day, fiscalYear: knownFiscalCalendar ? year + Number(month > endMonth!) : null,
      period: frequency === 'annual' ? 'FY' : quarter === null ? 'Quarter' : `Q${quarter}`,
      reportedCurrency: currency && /^[A-Z]{3}$/.test(currency) ? currency : null, source: 'Business Quant'};
    for (const [field, aliases] of Object.entries(fields)) {
      const observation = aliases.map((alias) => entries.get(alias)?.get(day)).find((entry) => entry?.value !== null && entry?.value !== undefined);
      let value = observation?.value ?? null;
      if (statement === 'Ratios' && value !== null && observation?.datatype === '%') value /= 100;
      row[field] = value;
    }
    const plus = (a: unknown, b: unknown): number | null => number(a) !== null && number(b) !== null ? number(a)! + number(b)! : null;
    if (statement === 'BS') {
      row.totalDebt ??= plus(row.shortTermDebt, row.longTermDebt);
      row.cashAndShortTermInvestments ??= plus(row.cashAndCashEquivalents, row.shortTermInvestments);
      const cash = number(row.cashAndShortTermInvestments) ?? number(row.cashAndCashEquivalents);
      row.netDebt ??= number(row.totalDebt) !== null && cash !== null ? number(row.totalDebt)! - cash : null;
    }
    if (statement === 'CF') {
      row.netCashProvidedByOperatingActivities = row.operatingCashFlow;
      row.freeCashFlow ??= number(row.operatingCashFlow) !== null && number(row.capitalExpenditure) !== null ? number(row.operatingCashFlow)! - Math.abs(number(row.capitalExpenditure)!) : null;
      row.netCommonStockIssuance ??= number(row.commonStockIssuance) !== null && number(row.commonStockRepurchased) !== null ? number(row.commonStockIssuance)! - Math.abs(number(row.commonStockRepurchased)!) : null;
    }
    return row;
  });
}
export function normalizeProfile(payload: unknown, symbol: string): Row {
  const row = object(payload);
  if (text(row.ticker)?.toUpperCase() !== symbol) throw new Error(`Invalid Business Quant profile for ${symbol}.`);
  return {symbol, companyName: text(row.name), companyNameLong: text(row.name), sector: text(row.sector), industry: text(row.industry),
    exchange: text(row.exchange), exchangeFullName: text(row.exchanges), description: text(row.profile), cik: row.cik ?? null,
    fiscalYearEnd: text(row.fiscalyearend), currency: text(row.currency), country: null, city: null, ceo: null, fullTimeEmployees: null,
    website: null, ipoDate: null, beta: null, image: null, marketCap: null, source: 'Business Quant'};
}
export function normalizeSnapshot(payload: unknown, symbol: string): Row[] {
  if (!Array.isArray(payload)) throw new Error('Invalid Business Quant snapshot response.');
  return payload.map(object).filter((row) => text(row.ticker)?.toUpperCase() === symbol).flatMap((row) => {
    const price = number(row.price);
    if (price === null || price <= 0) return [];
    const change = number(row.pricechange);
    const pricedate = text(row.pricedate);
    // Only timestamp an explicitly zoned instant. Never invent a fresh quote timestamp.
    const milliseconds = pricedate && /(?:Z|[+-]\d{2}:?\d{2})$/.test(pricedate) ? Date.parse(pricedate) : NaN;
    return [{symbol, name: text(row.name), exchange: text(row.exchange), price, change, changePercentage: number(row.pricechange_pct),
      previousClose: change !== null && price - change > 0 ? price - change : null, timestamp: Number.isFinite(milliseconds) ? milliseconds / 1000 : null,
      asOf: pricedate, volume: null, marketCap: null, dayLow: null, dayHigh: null, open: null, yearHigh: null, yearLow: null,
      priceAvg50: null, priceAvg200: null, source: 'Business Quant'}];
  });
}
export function normalizeEstimates(revenuePayload: unknown, epsPayload: unknown, symbol: string, frequency: string): Row[] {
  const merged = new Map<string, Row>();
  for (const [kind, payload] of [['revenue', revenuePayload], ['eps', epsPayload]] as const) {
    if (payload === null) continue;
    const envelope = object(payload);
    if (text(object(envelope.metadata).ticker)?.toUpperCase() !== symbol || !Array.isArray(envelope.data)) throw new Error(`Invalid Business Quant ${kind} estimates.`);
    const metadata = object(envelope.metadata);
    const currency = text(metadata.currency);
    for (const groupRaw of envelope.data) {
      const group = object(groupRaw);
      if (group.dimension !== frequency || !Array.isArray(group.estimates)) continue;
      for (const pointRaw of group.estimates) {
        const point = object(pointRaw);
        const label = text(point.period);
        const match = frequency === 'annual' ? /^(\d{4})$/.exec(label ?? '') : /^Q([1-4])\s+(\d{2}|\d{4})$/.exec(label ?? '');
        if (!label || !match) continue;
        const yearText = frequency === 'annual' ? match[1] : match[2];
        const year = Number(yearText.length === 2 ? `20${yearText}` : yearText);
        const row = merged.get(label) ?? {symbol, date: null, periodLabel: label, fiscalYear: year, fiscalQuarter: frequency === 'annual' ? null : Number(match[1]),
          isForecast: true, revenueAvg: null, revenueHigh: null, revenueLow: null, epsAvg: null, epsHigh: null, epsLow: null,
          numAnalystsRevenue: null, numAnalystsEps: null, currency: null, source: 'Business Quant'};
        row.isForecast = row.isForecast === true && point.data_type === 'estimate';
        row[`${kind}Avg`] = number(point.value_estimate);
        row[`${kind}High`] = number(point.high_estimate);
        row[`${kind}Low`] = number(point.low_estimate);
        if (currency && /^[A-Z]{3}$/.test(currency)) {
          if (row.currency && row.currency !== currency) throw new Error(`Conflicting estimate currencies for ${symbol}.`);
          row.currency = currency;
        }
        merged.set(label, row);
      }
    }
  }
  return [...merged.values()].sort((a,b) => Number(a.fiscalYear) - Number(b.fiscalYear) || Number(a.fiscalQuarter) - Number(b.fiscalQuarter));
}
export function aggregateMinutes(rawRows: Row[], interval: number): Row[] {
  const rows = [...new Map(rawRows.map((row) => [String(row.date), row])).values()].sort((a,b) => String(a.date).localeCompare(String(b.date)));
  const groups = new Map<string, Row>();
  let previousDay = '';
  let previousVolume: number | null = null;
  for (const row of rows) {
    const date = text(row.date);
    if (!date || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(date)) continue;
    const day = date.slice(0,10);
    const cumulative = number(row.volume);
    const volume = cumulative === null ? null : previousDay !== day || previousVolume === null ? cumulative : cumulative >= previousVolume ? cumulative - previousVolume : null;
    previousDay = day; previousVolume = cumulative;
    const minute = Number(date.slice(11,13))*60 + Number(date.slice(14,16));
    const bucket = Math.floor(minute/interval)*interval;
    const key = `${day} ${String(Math.floor(bucket/60)).padStart(2,'0')}:${String(bucket%60).padStart(2,'0')}:00`;
    const open = number(row.open), high = number(row.high), low = number(row.low), close = number(row.close);
    if (open === null || high === null || low === null || close === null || volume === null) continue;
    const existing = groups.get(key);
    if (!existing) groups.set(key, {date:key,open,high,low,close,volume});
    else { existing.high = Math.max(Number(existing.high),high); existing.low = Math.min(Number(existing.low),low); existing.close=close; existing.volume=Number(existing.volume)+volume; }
  }
  return [...groups.values()].reverse();
}

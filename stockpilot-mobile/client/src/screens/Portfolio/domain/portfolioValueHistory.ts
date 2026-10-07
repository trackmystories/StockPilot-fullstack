import type { PortfolioDetail } from './portfolio';

export type ValueHistoryPoint = {
  date: string;
  timestamp: number;
  value: number | null;
};

export const VALUE_HISTORY_RANGES = ['1W', '1M', '3M', '1Y', 'ALL'] as const;
export type ValueHistoryRange = (typeof VALUE_HISTORY_RANGES)[number];
type PlotPoint = { x: number; y: number };

const DAY_MS = 86_400_000;
const RANGE_DAYS = { '1W': 7, '1M': 30, '3M': 90, '1Y': 365 } as const;

function dayTimestamp(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const timestamp = Date.parse(`${date}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === date
    ? timestamp
    : null;
}

function chartValue(value: string | null | undefined): number | null {
  if (typeof value !== 'string' || !/^\d+(?:\.\d+)?$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function buildPortfolioValueHistory(detail: PortfolioDetail): ValueHistoryPoint[] {
  const { portfolio, analysis } = detail;
  const asOf = Date.parse(analysis.calculatedAt);
  if (!Number.isFinite(asOf)) return [];
  const currentDate = new Date(asOf).toISOString().slice(0, 10);
  const byDate = new Map<string, ValueHistoryPoint & { observedAt: number }>();

  for (const observation of detail.observations ?? []) {
    // Version 2 stores stocks only. Older observations may include cash.
    if (!observation || observation.reportingVersion !== 2
      || observation.currency !== portfolio.currency
      || observation.epoch !== portfolio.historyEpoch
      || !Number.isInteger(observation.revision)
      || observation.revision > portfolio.revision) continue;
    const timestamp = dayTimestamp(observation.date);
    const observedAt = Date.parse(observation.observedAt);
    if (timestamp === null || !Number.isFinite(observedAt) || observedAt > asOf
      || observation.date > currentDate
      || new Date(observedAt).toISOString().slice(0, 10) !== observation.date) continue;
    const previous = byDate.get(observation.date);
    if (!previous || observedAt >= previous.observedAt) {
      byDate.set(observation.date, {
        date: observation.date,
        timestamp,
        observedAt,
        value: chartValue(observation.value),
      });
    }
  }

  // Add only the actual current stock valuation, not fabricated earlier points.
  // Replace the day's observation: the server also stores one point per UTC day.
  if (analysis.reportingVersion === 2 && analysis.currency === portfolio.currency
    && analysis.revision === portfolio.revision) {
    byDate.set(currentDate, {
      date: currentDate,
      timestamp: dayTimestamp(currentDate)!,
      observedAt: asOf,
      value: chartValue(analysis.holdingsValue),
    });
  }

  return [...byDate.values()]
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(({ date, timestamp, value }) => ({ date, timestamp, value }));
}

export function selectValueHistory(
  points: readonly ValueHistoryPoint[],
  range: ValueHistoryRange,
): ValueHistoryPoint[] {
  const last = points[points.length - 1];
  if (!last || range === 'ALL') return [...points];
  const start = last.timestamp - (RANGE_DAYS[range] - 1) * DAY_MS;
  return points.filter((point) => point.timestamp >= start);
}

export function createValueGraph(
  points: readonly ValueHistoryPoint[],
  width: number,
  height: number,
): {
  segments: { line: string; area: string; points: PlotPoint[] }[];
  dots: PlotPoint[];
} {
  const valid = points.filter((point) => point.value !== null && Number.isFinite(point.value));
  if (!valid.length || !Number.isFinite(width) || width <= 16
    || !Number.isFinite(height) || height <= 16) return { segments: [], dots: [] };

  const values = valid.map((point) => point.value!);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const span = maximum - minimum;
  const firstTime = points[0].timestamp;
  const timeSpan = points[points.length - 1].timestamp - firstTime;
  const inset = 8;
  const bottom = height - inset;
  const sections: PlotPoint[][] = [];
  let current: PlotPoint[] = [];

  for (const point of points) {
    if (point.value === null || !Number.isFinite(point.value)) {
      if (current.length) sections.push(current);
      current = [];
      continue;
    }
    current.push({
      x: timeSpan > 0 ? inset + (point.timestamp - firstTime) / timeSpan * (width - 2 * inset) : width / 2,
      y: span > 0 ? bottom - (point.value - minimum) / span * (height - 2 * inset) : height / 2,
    });
  }
  if (current.length) sections.push(current);

  const segments = sections.filter((section) => section.length >= 2).map((section) => {
    const line = section.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
    return {
      line,
      area: `${line} L${section[section.length - 1].x.toFixed(2)} ${bottom} L${section[0].x.toFixed(2)} ${bottom} Z`,
      points: section,
    };
  });
  const dots = sections.filter((section) => section.length === 1).map((section) => section[0]);
  const lastSection = sections[sections.length - 1];
  if (lastSection.length > 1) dots.push(lastSection[lastSection.length - 1]);
  return { segments, dots };
}

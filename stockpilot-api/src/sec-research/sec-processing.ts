import type {Filing} from './sec-research.types';

export type ResearchMode = 'focused' | 'backfill';

export function researchMode(): ResearchMode {
  const value = process.env.SEC_RESEARCH_MODE ?? 'focused';
  if (value !== 'focused' && value !== 'backfill') {
    throw new Error('SEC_RESEARCH_MODE must be focused or backfill.');
  }
  return value;
}

export function workerCount(): number {
  const value = Number(process.env.SEC_RESEARCH_CONCURRENCY ?? 3);
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new Error('SEC_RESEARCH_CONCURRENCY must be between 1 and 6.');
  }
  return value;
}

export function focusFilings(filings: Filing[], now = Date.now()): Filing[] {
  const sorted = [...filings].sort((a, b) => b.filedAt.localeCompare(a.filedAt));
  const selected = new Map<string, Filing>();
  for (const pattern of [/^(10-K|20-F|40-F)$/, /^10-Q$/]) {
    const base = sorted.find((filing) => pattern.test(filing.form));
    if (!base) continue;
    selected.set(base.accession, base);
    for (const filing of sorted) {
      if (filing.form === `${base.form}/A` && filing.reportDate === base.reportDate) {
        selected.set(filing.accession, filing);
      }
    }
  }
  const since = new Date(now - 90 * 86400000).toISOString().slice(0, 10);
  // Foreign interim results are normally furnished on 6-K. Selection is by date,
  // not a claim that every material disclosure has been identified.
  for (const filing of sorted
    .filter((row) => /^(8-K|6-K)(\/A)?$/.test(row.form) && row.filedAt >= since)
    .slice(0, 6)) {
    selected.set(filing.accession, filing);
  }
  return [...selected.values()].sort((a, b) => b.filedAt.localeCompare(a.filedAt));
}

export async function runWorkers<T>(
  items: T[],
  count: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  let failure: unknown;
  let stopped = false;
  await Promise.all(
    Array.from({length: Math.min(count, items.length)}, async () => {
      while (!stopped && next < items.length) {
        const item = items[next++];
        try {
          await task(item);
        } catch (error) {
          failure = error;
          stopped = true;
        }
      }
    }),
  );
  // All in-flight workers finish before the caller releases its lease.
  if (stopped) throw failure;
}
import {hash, LAYER_NAMES} from '../sec-research/sec-research.types';
import {validEvidence} from './report-evidence';
import type {ReportChart, ReportInput, ReportSource} from './report.types';

const monthNames = [
  'jan',
  'feb',
  'mar',
  'apr',
  'may',
  'jun',
  'jul',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
];

function periodDate(cell: string): string | null {
  const match = cell.trim().match(/^(\d{1,2})-([A-Za-z]+)-(\d{2}|\d{4})$/);
  if (!match) return null;
  const month = monthNames.indexOf(match[2].slice(0, 3).toLowerCase());
  const year = match[3].length === 2 ? 2000 + Number(match[3]) : Number(match[3]);
  const parsed = new Date(Date.UTC(year, month, Number(match[1])));
  if (month < 0 || parsed.getUTCMonth() !== month || parsed.getUTCDate() !== Number(match[1]))
    return null;
  return parsed.toISOString().slice(0, 10);
}

function numericRow(cells: string[]): number[] | null {
  // SEC HTML sometimes places the closing parenthesis in its own cell.
  const joined: string[] = [];
  for (const cell of cells) {
    if (cell === ')' && joined.length) joined[joined.length - 1] += ')';
    else joined.push(cell);
  }
  const values: number[] = [];
  for (const cell of joined) {
    if (!/^(?:-?\d[\d,]*(?:\.\d+)?|\(\d[\d,]*(?:\.\d+)?\))$/.test(cell)) return null;
    const value = Number(cell.replace(/[(),]/g, '')) * (cell.startsWith('(') ? -1 : 1);
    if (!Number.isFinite(value)) return null;
    values.push(value);
  }
  return values;
}

// Deliberately narrow: do not guess units, dates, mixed durations or table columns.
// Unsupported SEC layouts stay available as evidence rather than becoming wrong graphs.
export function reportedCharts(
  input: ReportInput,
  sources: Map<string, ReportSource>,
): ReportChart[] {
  const financial = financialHistoryCharts(input, sources);
  if (financial.length) return financial;
  const evidence = LAYER_NAMES.flatMap((name) => input.sec.layers[name]?.evidence ?? [])
    .filter((item) => validEvidence(item) && item.table)
    .sort((a, b) => b.source.filedAt.localeCompare(a.source.filedAt));
  for (const item of evidence) {
    const table = item.table!;
    if (!/US\s*\$\s*in millions|USD\s*in millions/i.test(table)) continue;
    if (
      !/Three Months Ended/i.test(table) ||
      /Six Months|Nine Months|Year[s]? Ended/i.test(table)
    )
      continue;
    const rows = table.split('\n').map((row) =>
      row
        .split('|')
        .map((cell) => cell.trim())
        .filter(Boolean),
    );
    const header = rows.find(
      (row) => row.length >= 2 && row.every((cell) => periodDate(cell)),
    );
    if (!header || header.length > 8) continue;
    const periods = header.map((cell) => periodDate(cell)!);
    if (new Set(periods).size !== periods.length) continue;
    const revenueRow = rows.find((row) => /^(total )?revenues?$/i.test(row[0]));
    const revenue = revenueRow ? numericRow(revenueRow.slice(1)) : null;
    if (!revenue || revenue.length !== periods.length) continue;
    const sourceId = hash(`${item.source.url}:${item.source.sha256}`).slice(0, 20);
    sources.set(sourceId, {
      id: sourceId,
      kind: 'sec',
      label: `${item.source.form} · filed ${item.source.filedAt}`,
      asOf: item.source.filedAt,
      url: item.source.url,
      documentPath: item.source.rawPath,
      fieldPath: `block:${item.block}`,
      accession: item.source.accession,
      reportDate: item.source.reportDate || null,
      sha256: item.source.sha256,
    });
    const chart = (
      id: string,
      title: string,
      values: number[],
      description: string,
    ): ReportChart => ({
      id,
      title,
      description,
      kind: 'reported',
      unit: 'USD million',
      points: periods
        .map((label, index) => ({label, value: values[index], sourceIds: [sourceId]}))
        .sort((a, b) => a.label.localeCompare(b.label)),
      footnote:
        'Each bar covers the three months ending on its labelled date. Only the periods available in this filing are shown; gaps are not filled.',
    });
    const charts = [
      chart(
        'reported-revenue',
        'Revenue by quarter',
        revenue,
        'Revenue is the money earned from selling products and services, before subtracting costs.',
      ),
    ];
    const profitRow = rows.find((row) =>
      /^net (?:loss|(?:income|profit)(?:\s*\(loss\))?)$/i.test(row[0]),
    );
    const profit = profitRow ? numericRow(profitRow.slice(1)) : null;
    if (profit && profit.length === periods.length) {
      // A row explicitly named "Net loss" may show positive magnitudes.
      const values = /^net loss$/i.test(profitRow![0])
        ? profit.map((value) => -Math.abs(value))
        : profit;
      charts.push(
        chart(
          'reported-profit',
          'Profit or loss by quarter',
          values,
          'Values below zero are losses. Revenue can grow while the company still loses money.',
        ),
      );
    }
    return charts;
  }
  return [];
}

function financialHistoryCharts(
  input: ReportInput,
  sources: Map<string, ReportSource>,
): ReportChart[] {
  const history = input.financialHistory;
  if (!history) return [];
  const rows = history.income
    .map((row, index) => ({row, index}))
    .filter(({row}) => {
      if (row.symbol && row.symbol !== input.symbol) return false;
      if (typeof row.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) return false;
      const date = new Date(`${row.date}T00:00:00Z`);
      return (
        Number.isFinite(date.getTime()) &&
        date.toISOString().slice(0, 10) === row.date &&
        typeof row.period === 'string' &&
        /^Q[1-4]$/.test(row.period) &&
        typeof row.reportedCurrency === 'string' &&
        /^[A-Z]{3}$/.test(row.reportedCurrency)
      );
    })
    .sort((a, b) => String(a.row.date).localeCompare(String(b.row.date)))
    .slice(-8);
  if (rows.length < 2 || new Set(rows.map(({row}) => row.reportedCurrency)).size !== 1)
    return [];
  if (new Set(rows.map(({row}) => row.date)).size !== rows.length) return [];
  const charts: ReportChart[] = [];
  for (const metric of ['revenue', 'netIncome'] as const) {
    const points = rows.flatMap(({row, index}) => {
      const value = row[metric];
      if (typeof value !== 'number' || !Number.isFinite(value)) return [];
      const documentPath = `screenerRuns/${input.sourceRunId}/preparedInputs/${input.symbol}`;
      const fieldPath = `financials.income[${index}].${metric}`;
      const id = hash(`${documentPath}:${fieldPath}`).slice(0, 20);
      sources.set(id, {
        id,
        kind: 'calculation',
        label: 'StockPilot financial history',
        asOf: history.preparedAt,
        url: null,
        documentPath,
        fieldPath,
        accession: null,
        reportDate: String(row.date),
        sha256: null,
      });
      return [{label: String(row.date), value: value / 1000000, sourceIds: [id]}];
    });
    if (points.length < 2) continue;
    charts.push({
      id: metric === 'revenue' ? 'reported-revenue' : 'reported-profit',
      title: metric === 'revenue' ? 'Revenue by quarter' : 'Profit or loss by quarter',
      description:
        metric === 'revenue'
          ? 'Revenue is the money earned from selling products and services, before subtracting costs.'
          : 'Net income is the profit or loss after expenses. Values below zero are losses.',
      kind: 'reported',
      unit: `${String(rows[0].row.reportedCurrency)} million`,
      points,
      footnote:
        'Quarterly statements from the saved financial snapshot. Dates are period ends; values are in millions. Missing quarters are not filled or treated as zero.',
    });
  }
  return charts;
}
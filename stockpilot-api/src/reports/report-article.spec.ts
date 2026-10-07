import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildReport} from './report-builder';
import {emptyLayers, hash, type Evidence} from '../sec-research/sec-research.types';
import type {ReportInput} from './report.types';

function fixture(): ReportInput {
  return {
    symbol: 'ANY',
    companyName: 'Any Company',
    sourceRunId: 'snapshot',
    financial: {
      calculatedAt: Date.parse('2026-09-26'),
      analysis: {
        metrics: {
          growth: {revenueGrowthYoY: 20},
          profitability: {operatingMarginTtm: -5},
        },
        fairValue: {
          eligible: true,
          currentPrice: 10,
          estimatedFairValue: 12,
          currency: 'USD',
          methods: [{source: 'peer', impliedValue: 12}],
        },
        earningsOutlook: {
          currentPeriod: '2026-12-31',
          nextPeriod: '2027-12-31',
          revenue: {currentEstimate: 100, nextEstimate: 150},
          eps: {currentEstimate: -2, nextEstimate: -1},
        },
      },
    },
    scorecard: null,
    sec: {metadata: null, layers: emptyLayers(), status: 'prepared'},
  };
}

function tableEvidence(table: string): Evidence {
  return {
    id: hash(table),
    quote: table.replace(/\n/g, ' '),
    table,
    context: 'Quarterly results',
    section: 'Results',
    block: 4,
    attribution: 'issuer_disclosure',
    interpretation: 'source_excerpt_not_independently_verified',
    source: {
      cik: '0001899123',
      accession: '0001213900-26-086938',
      form: '6-K',
      filedAt: '2026-08-10',
      reportDate: '2026-06-30',
      url: 'https://www.sec.gov/Archives/edgar/data/1899123/000121390026086938/results.htm',
      rawPath: `sec/raw/${'a'.repeat(64)}.bin`,
      sha256: 'a'.repeat(64),
    },
  };
}

const resultsTable =
  'US $ in millions | Three Months Ended\n | 30-June-26 | 31-Mar-26 | 30-June-25\nTotal revenue | 228.8 | 188.9 | 155.6\nNet loss | (92.3 | ) | (159.5 | ) | (62.9 | )';

test('report contains sourced readable analysis and forecast charts for any symbol', () => {
  const report = buildReport(fixture());
  const article = (report as any).article;
  assert.ok(article, 'Readable article must be prepared by the universe report builder');
  assert.match(JSON.stringify(article), /operating loss/i);
  assert.match(JSON.stringify(article), /both periods/i);
  const charts = article.sections.flatMap((section: any) => section.charts);
  const forecast = charts.find((chart: any) => chart.id === 'revenue-outlook');
  assert.equal(forecast.unit, 'Index');
  assert.deepEqual(
    forecast.points.map((point: any) => point.value),
    [100, 150],
  );
  assert.equal(forecast.kind, 'forecast');
  assert.ok(
    charts.find((chart: any) => chart.id === 'valuation').footnote.includes('comparability'),
  );
  const sourceIds = new Set(report.sources.map((source) => source.id));
  for (const section of article.sections) {
    for (const paragraph of section.paragraphs) {
      if (paragraph.kind !== 'explanation') assert.ok(paragraph.sourceIds.length);
      assert.ok(paragraph.sourceIds.every((id: string) => sourceIds.has(id)));
    }
    for (const chart of section.charts) {
      for (const point of chart.points) {
        assert.ok(point.sourceIds.length);
        assert.ok(point.sourceIds.every((id: string) => sourceIds.has(id)));
      }
    }
  }
});

test('reported quarterly charts keep dates, loss signs and units from saved evidence', () => {
  const data = fixture();
  data.sec.layers.managementExplanations.evidence.push(tableEvidence(resultsTable));
  const article = (buildReport(data) as any).article;
  assert.ok(article);
  const charts = article.sections.flatMap((section: any) => section.charts);
  const revenue = charts.find((chart: any) => chart.id === 'reported-revenue');
  assert.equal(revenue.unit, 'USD million');
  assert.deepEqual(
    revenue.points.map((p: any) => p.value),
    [155.6, 188.9, 228.8],
  );
  assert.deepEqual(
    revenue.points.map((p: any) => p.label),
    ['2025-06-30', '2026-03-31', '2026-06-30'],
  );
  assert.deepEqual(
    charts.find((c: any) => c.id === 'reported-profit').points.map((p: any) => p.value),
    [-62.9, -159.5, -92.3],
  );
});

test('ambiguous tables and unknown units do not become graphs', () => {
  for (const table of [
    resultsTable.replace('US $ in millions', 'Amount'),
    resultsTable.replace('188.9', 'N/A'),
    resultsTable.replace('Three Months Ended', 'Nine Months Ended'),
  ]) {
    const data = fixture();
    data.sec.layers.managementExplanations.evidence.push(tableEvidence(table));
    const article = (buildReport(data) as any).article;
    assert.ok(article);
    assert.ok(
      !article.sections
        .flatMap((s: any) => s.charts)
        .some((c: any) => c.id === 'reported-revenue'),
    );
  }
});

test('missing data does not create zero-valued charts, a price target or a fabricated narrative', () => {
  const data = fixture();
  data.financial = null;
  const article = (buildReport(data) as any).article;
  assert.ok(article);
  assert.equal(article.sections.flatMap((s: any) => s.charts).length, 0);
  assert.equal(
    article.sections
      .flatMap((s: any) => s.paragraphs)
      .filter((p: any) => p.kind !== 'explanation').length,
    0,
  );
});

test('loss-first mixed income rows are not assigned the opposite sign', () => {
  const data = fixture();
  data.sec.layers.managementExplanations.evidence.push(
    tableEvidence(resultsTable.replace('Net loss', 'Net loss (income)')),
  );
  const charts = buildReport(data).article!.sections.flatMap((section) => section.charts);
  assert.ok(charts.some((chart) => chart.id === 'reported-revenue'));
  assert.ok(!charts.some((chart) => chart.id === 'reported-profit'));
});

test('unknown valuation currency hides the money chart and ineligible models stay hidden', () => {
  const data = fixture();
  const fairValue = data.financial!.analysis!.fairValue as Record<string, unknown>;
  delete fairValue.currency;
  assert.ok(
    !buildReport(data)
      .article!.sections.flatMap((section) => section.charts)
      .some((chart) => chart.id === 'valuation'),
  );
  fairValue.currency = 'USD';
  fairValue.eligible = false;
  assert.ok(
    !buildReport(data)
      .article!.sections.flatMap((section) => section.charts)
      .some((chart) => chart.id === 'valuation'),
  );
});

test('zero forecast base does not create an infinite revenue index', () => {
  const data = fixture();
  (data.financial!.analysis!.earningsOutlook as any).revenue.currentEstimate = 0;
  const article = buildReport(data).article!;
  assert.ok(
    !article.sections
      .flatMap((section) => section.charts)
      .some((chart) => chart.id === 'revenue-outlook'),
  );
  assert.ok(!JSON.stringify(article).includes('Infinity'));
});

test('any stock can chart cached quarterly statements without SEC tables', () => {
  const data = fixture();
  data.symbol = 'OTHER';
  (data as any).financialHistory = {
    preparedAt: '2026-09-26T00:00:00Z',
    income: [
      {
        date: '2026-06-30',
        period: 'Q2',
        reportedCurrency: 'EUR',
        revenue: 2000000,
        netIncome: -500000,
      },
      {
        date: '2026-03-31',
        period: 'Q1',
        reportedCurrency: 'EUR',
        revenue: 1000000,
        netIncome: 0,
      },
    ],
  };
  const report = buildReport(data);
  const chart = report
    .article!.sections.flatMap((s) => s.charts)
    .find((c) => c.id === 'reported-revenue');
  assert.ok(chart);
  assert.equal(chart.unit, 'EUR million');
  assert.deepEqual(
    chart.points.map((p) => p.value),
    [1, 2],
  );
  assert.ok(
    chart.points.every((p) =>
      p.sourceIds.every((id) =>
        report.sources.some(
          (source) =>
            source.id === id && source.documentPath.endsWith('/preparedInputs/OTHER'),
        ),
      ),
    ),
  );
  const profit = report
    .article!.sections.flatMap((s) => s.charts)
    .find((c) => c.id === 'reported-profit');
  assert.deepEqual(
    profit!.points.map((p) => p.value),
    [0, -0.5],
  );
});

test('quarterly history does not mix currencies, annual periods or conflicting dates', () => {
  const row = {
    date: '2026-03-31',
    period: 'Q1',
    reportedCurrency: 'EUR',
    revenue: 1000000,
    netIncome: 0,
  };
  for (const extra of [
    {...row, date: '2026-06-30', period: 'Q2', reportedCurrency: 'USD'},
    {...row, date: '2026-12-31', period: 'FY'},
    {...row, revenue: 2000000},
  ]) {
    const data = fixture();
    data.financialHistory = {preparedAt: null, income: [row, extra]};
    const charts = buildReport(data).article!.sections.flatMap((section) => section.charts);
    assert.ok(!charts.some((chart) => chart.kind === 'reported'));
  }
});
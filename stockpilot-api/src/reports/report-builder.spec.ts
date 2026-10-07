import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildReport, reportFingerprint} from './report-builder';
import {emptyLayers, hash, type Evidence} from '../sec-research/sec-research.types';
import type {ReportInput} from './report.types';

const input = (): ReportInput => ({
  symbol: 'TEST',
  companyName: 'Test Company',
  sourceRunId: 'frozen-run',
  financial: null,
  scorecard: null,
  sec: {metadata: null, layers: emptyLayers(), status: 'not_prepared'},
});

function evidence(quote: string): Evidence {
  return {
    id: hash(quote),
    quote,
    context: '',
    section: 'Business',
    block: 3,
    table: null,
    attribution: 'issuer_disclosure',
    interpretation: 'source_excerpt_not_independently_verified',
    source: {
      cik: '0001899123',
      accession: '0001213900-26-049770',
      form: '20-F',
      filedAt: '2026-04-30',
      reportDate: '2025-12-31',
      url: 'https://www.sec.gov/Archives/edgar/data/1899123/000121390026049770/report.htm',
      rawPath: `sec/raw/${'a'.repeat(64)}.bin`,
      sha256: 'a'.repeat(64),
    },
  };
}

test('empty sources produce coverage gaps without invented facts', () => {
  const report = buildReport(input(), '2026-09-27T00:00:00.000Z');
  assert.equal(report.status, 'limited');
  assert.equal(report.sections.filter((s) => s.id.startsWith('sec-')).length, 6);
  assert.equal(report.sections.flatMap((s) => s.statements).length, 0);
  assert.equal(report.sources.length, 0);
});

test('SEC quotes retain attribution and traceable sources; boilerplate and page numbers are excluded', () => {
  const data = input();
  data.sec.layers.businessProfile.evidence = [
    evidence('We operate twelve data centers providing hosting services to enterprise customers.'),
    evidence('37'),
    evidence(
      'This report contains forward-looking statements subject to known and unknown risks and uncertainties.',
    ),
  ];
  const report = buildReport(data);
  const section = report.sections.find((s) => s.id === 'sec-businessProfile')!;
  assert.equal(section.statements.length, 1);
  assert.equal(section.statements[0].kind, 'issuer');
  assert.equal(section.statements[0].text, data.sec.layers.businessProfile.evidence[0].quote);
  for (const statement of report.sections.flatMap((s) => s.statements)) {
    assert.ok(statement.sourceIds.length);
    assert.ok(statement.sourceIds.every((id) => report.sources.some((s) => s.id === id)));
  }
});

test('fingerprint ignores generation time but changes when saved evidence changes', () => {
  const data = input();
  const before = reportFingerprint(data);
  assert.equal(before, reportFingerprint(structuredClone(data)));
  data.sec.layers.riskFactors.evidence.push(
    evidence('We depend on one customer for substantially all of our revenue.'),
  );
  assert.notEqual(before, reportFingerprint(data));
});

test('ineligible valuation and zero financial metrics do not become fabricated upside', () => {
  const data = input();
  data.financial = {
    calculatedAt: 1,
    analysis: {
      metrics: {growth: {revenueGrowthYoY: 0}},
      fairValue: {eligible: false, currentPrice: 10, estimatedFairValue: 20},
    },
  };
  const report = buildReport(data);
  assert.ok(
    report.sections
      .find((s) => s.id === 'financials')!
      .statements.some((s) => s.text.includes('0.0%')),
  );
  assert.equal(report.sections.find((s) => s.id === 'valuation')!.tables.length, 0);
});

test('invalid or cross-issuer SEC URLs cannot become clickable citations', () => {
  const data = input();
  const item = evidence(
    'We operate twelve data centers providing hosting services to enterprise customers.',
  );
  item.source.url = 'https://evil.example/report';
  data.sec.layers.businessProfile.evidence.push(item);
  assert.equal(buildReport(data).sources.length, 0);
});

test('risk disclosures cached under another layer can populate risks without becoming segment facts', () => {
  const data = input();
  const item = evidence(
    'We may be unable to obtain the additional capital required to complete these projects, which could materially harm our operations.',
  );
  item.section = 'Risks related to financing our operations';
  data.sec.layers.segmentIntelligence.evidence.push(item);
  const report = buildReport(data);
  assert.equal(report.sections.find((s) => s.id === 'sec-riskFactors')!.statements.length, 1);
  assert.equal(
    report.sections.find((s) => s.id === 'sec-segmentIntelligence')!.statements.length,
    0,
  );
});

test('business model description outranks registered address and corporate history', () => {
  const data = input();
  data.sec.layers.businessProfile.evidence = [
    ...Array.from({length: 4}, (_, i) =>
      evidence(
        `Our registered office is located at ${i + 1} Example Street, Suite 100, New York, United States.`,
      ),
    ),
    evidence(
      'We primarily operate two business lines: subscription software and consulting services for enterprise customers.',
    ),
  ];
  const report = buildReport(data);
  const rows = report.sections.find((s) => s.id === 'sec-businessProfile')!.statements;
  assert.ok(rows[0].text.includes('two business lines'));
  assert.equal(rows.length, 1);
});
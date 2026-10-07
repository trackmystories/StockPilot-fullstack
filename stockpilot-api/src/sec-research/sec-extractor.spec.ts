import {strict as assert} from 'node:assert';
import {test} from 'node:test';
import {extractLayers, parseDocument, selectFilings, resolveCik} from './sec-extractor';

const source = {
  cik: '0000000001',
  accession: '0000000001-26-000001',
  form: '20-F',
  filedAt: '2026-03-01',
  reportDate: '2025-12-31',
  url: 'https://www.sec.gov/Archives/edgar/data/1/000000000126000001/report.htm',
  rawPath: 'sec/raw/example',
  sha256: 'a'.repeat(64),
};

test('six layers retain evidence and management attribution without inventing metrics', () => {
  const html = `<h2>Item 4. Information on the Company</h2>
    <p>We design mining equipment and operate data centers in Norway and the United States.</p>
    <h3>Operating Metrics</h3><p>Our self-mining hash rate reached 12 EH/s at December 31, 2025.</p>
    <h2>Item 5. Operating and Financial Review and Prospects</h2>
    <p>Revenue increased primarily due to additional computing capacity and higher customer demand.</p>
    <h2>Item 3.D. Risk Factors</h2><p>Our mining operations may be interrupted by electricity shortages.</p>
    <h2>Item 8. Financial Information</h2><h3>Segment information</h3>
    <p>Revenue in millions of USD for years ended December 31:</p>
    <table><tr><th>Segment</th><th>2025</th><th>2024</th></tr><tr><td>Mining</td><td>200</td><td>100</td></tr></table>
    <h3>Recent developments</h3><p>We entered into a material agreement to acquire a data center on February 1, 2026.</p>`;
  const result = extractLayers(parseDocument(Buffer.from(html)), source);
  for (const layer of Object.values(result.layers)) assert.ok(layer.evidence.length > 0);
  assert.equal(result.layers.managementExplanations.evidence[0].attribution, 'management');
  assert.equal(result.layers.operatingKpis.evidence[0].quote.includes('12 EH/s'), true);
  const segment = result.layers.segmentIntelligence.evidence.find((item) => item.table);
  assert.ok(segment?.table?.includes('2025'));
  assert.ok(segment?.context.includes('millions of USD'));
  for (const layer of Object.values(result.layers)) {
    for (const item of layer.evidence) assert.deepEqual(item.source, source);
  }
});

test('ignores hidden inline XBRL and preserves ordinary ampersands', () => {
  const blocks = parseDocument(
    Buffer.from('<ix:hidden>FAKE ARR 999</ix:hidden><p>Research &amp; development</p>'),
  );
  assert.equal(blocks.map((b) => b.text).join(' '), 'Research & development');
});

test('empty evidence produces empty layers; unrelated sections do not inherit risk classification', () => {
  const result = extractLayers(
    parseDocument(
      Buffer.from(
        '<h2>Risk Factors</h2><p>Our facilities could lose power during extreme weather conditions.</p><h2>Item 5. Market for Common Equity</h2><p>Our shares traded at 12 dollars on December 31, 2025.</p>',
      ),
    ),
    {...source, form: '10-K'},
  );
  assert.equal(result.layers.riskFactors.evidence.length, 1);
  assert.equal(result.layers.operatingKpis.evidence.length, 0);
  assert.equal(result.layers.segmentIntelligence.status, 'no_evidence');
});

test('selects supported forms and amendments without imposing a company count limit', () => {
  const recent = {
    form: ['20-F', '6-K/A', 'S-8'],
    accessionNumber: ['0000000001-26-000001', '0000000001-26-000002', '0000000001-26-000003'],
    filingDate: ['2026-01-01', '2026-02-01', '2026-02-01'],
    reportDate: ['', '', ''],
    primaryDocument: ['a.htm', 'b.htm', 'c.htm'],
  };
  assert.deepEqual(
    selectFilings(recent, '2025-01-01').map((f) => f.form),
    ['6-K/A', '20-F'],
  );
});

test('CIK resolution never guesses by removing foreign exchange suffixes', () => {
  const tickers = [
    {ticker: 'ABC', cik_str: 1},
    {ticker: 'BTDR', cik_str: 2},
  ];
  assert.equal(resolveCik('ABC.L', tickers), null);
  assert.equal(resolveCik('BTDR', tickers), '0000000002');
  assert.equal(resolveCik('ABC', [...tickers, {ticker: 'ABC', cik_str: 3}]), null);
});

test('risk subsections remain in risk factors until the next major item', () => {
  const html =
    '<h2>Item 1A. Risk Factors</h2><h3>Electricity shortages</h3><p>Our facilities could lose power during periods of high electricity demand.</p><h2>Item 2. Properties</h2><p>We lease facilities in three countries and own our headquarters building.</p>';
  const result = extractLayers(parseDocument(Buffer.from(html)), {...source, form: '10-K'});
  assert.equal(result.layers.riskFactors.evidence.length, 1);
  assert.match(result.layers.riskFactors.evidence[0].quote, /lose power/);
});

test('an industry-specific KPI table is retained under operating metrics without a keyword dictionary match', () => {
  const html =
    '<h2>Key operating metrics</h2><table><tr><th>Metric</th><th>2025</th></tr><tr><td>Available seat miles</td><td>120000</td></tr></table>';
  const result = extractLayers(parseDocument(Buffer.from(html)), source);
  assert.equal(result.layers.operatingKpis.evidence.length, 1);
});

test('plain text filings retain paragraph and section boundaries', () => {
  const text =
    'Item 1. Business\n\nWe operate power facilities and provide computing services to commercial customers.\n\nItem 1A. Risk Factors\n\nOur facilities could lose access to electricity during regional power shortages.';
  const result = extractLayers(parseDocument(Buffer.from(text)), {...source, form: '10-K'});
  assert.equal(result.layers.businessProfile.evidence.length, 1);
  assert.equal(result.layers.riskFactors.evidence.length, 1);
});
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildCatalog, mapSavedStock, queryCatalog, savedDataIsStale} from './stock-filter.logic';
import {SCORE_KEYS, type FilterStock} from './stock-filter.types';
const NOW = Date.parse('2026-09-28T00:00:00Z');
function stock(symbol: string, overrides: Partial<FilterStock> = {}): FilterStock {
  return {
    symbol,
    companyName: symbol,
    logoUrl: null,
    exchange: 'NASDAQ',
    sector: 'Technology',
    industry: 'Software',
    currency: 'USD',
    price: 50,
    marketCap: 5000000000,
    changePercentage: null,
    quoteAsOf: new Date(NOW).toISOString(),
    calculatedAt: new Date(NOW).toISOString(),
    stale: false,
    score: 8,
    coverage: 0.8,
    riskScore: 2,
    riskLevel: 'low',
    volatilityScore: 3,
    scores: Object.fromEntries(SCORE_KEYS.map((key) => [key, key === 'risk' ? 2 : 8])) as FilterStock['scores'],
    metrics: {
      pe: 15,
      forwardPe: 14,
      freeCashFlow: 100,
      netIncomeTtm: 20,
      revenueGrowthYoY: 20,
      fcfYield: 5,
      debtToEquity: 0.5,
      currentRatio: 2
    },
    secMetricsIncluded: false,
    ...overrides,
  };
}
const fixtures = [
  stock('AAA'),
  stock('BBB', {
    exchange: 'NYSE',
    riskScore: 8,
    riskLevel: 'high'
  }),
  stock('CCC', {
    sector: 'Financial Services',
    industry: 'Insurance',
    riskScore: null,
    riskLevel: null,
    scores: {...stock('X').scores, quality: null},
    metrics: {pe: null, freeCashFlow: null}
  })
];
function run(ids: string[], rows = fixtures, sort: 'symbol' | 'overall' | 'risk' = 'symbol') {
  return queryCatalog(buildCatalog(rows), ids, sort).map((row) => row.symbol);
}
test('empty selection includes saved stocks without inventing missing scores', () => assert.deepEqual(run([]), ['AAA', 'BBB', 'CCC']));
test('selections in one category use OR and different categories use AND', () => assert.deepEqual(run(['exchange:NASDAQ', 'exchange:NYSE', 'risk:low']), ['AAA']));
test('missing numeric data does not pass an upper-bound filter as zero', () => assert.deepEqual(run(['pe:20']), ['AAA', 'BBB']));
test('nonpositive valuation multiples are excluded', () => assert.deepEqual(run(['pe:20'], [stock('LOSS', {metrics: {pe: -3}}), stock('ZERO', {metrics: {pe: 0}})]), []));
test('missing quality cannot pass a quality threshold', () => assert.deepEqual(run(['quality:8']), ['AAA', 'BBB']));
test('USD size buckets never classify EUR values as dollars', () => assert.deepEqual(run(['marketCap:mid'], [stock('USD'), stock('EUR', {currency: 'EUR'})]), ['USD']));
test('sort puts missing risk last and low risk first', () => assert.deepEqual(run([], fixtures, 'risk'), ['AAA', 'BBB', 'CCC']));
test('invalid filters are rejected instead of silently broadening results', () => assert.throws(() => run(['unknown:option']), /no longer available/i));
test('single-choice thresholds reject multiple simultaneous selections', () => assert.throws(() => run(['quality:7', 'quality:8']), /one option/i));
test('industry options are grouped under their actual saved sectors', () => {
  const industry = buildCatalog(fixtures).sections.find((section) => section.id === 'industry');
  assert.ok(industry?.options.some((node) => node.label === 'Technology' && node.children?.some((child) => child.label === 'Software')));
});
test('sections with no source metric are not exposed', () => assert.equal(buildCatalog([stock('X', {metrics: {}})]).sections.some((section) => section.id === 'pe'), false));
test('cached values are mapped from preparedInputs plus scorecards, using 1–10 scores', () => {
  const score = {
    score: 8.2,
    coverage: 0.8,
    eligible: true,
    confidence: 'medium',
    direction: 'higher_is_better',
    components: {
      a: {
        score: 8,
        coverage: 1,
        weight: 1,
        rawValue: 10
      }
    }
  };
  const mapped = mapSavedStock('AAA', {
    symbol: 'AAA',
    preparedAt: '2026-09-27T00:00:00Z',
    company: {
      companyName: 'Example',
      sector: 'Technology',
      currency: 'USD'
    },
    risk: {logoUrl: 'https://example.test/logo.png'},
    sourceObservations: {quote: {changePercentage: 1.5}}
  }, {
    calculatedAt: NOW,
    data: {
      scores: {
        overall: score,
        quality: score,
        risk: {...score, score: 2}
      },
      metrics: {
        price: 100,
        marketCap: 5000,
        pe: 15,
        secSupplement: {status: 'used'}
      }
    }
  }, NOW);
  assert.equal(mapped.symbol, 'AAA');
  assert.equal(mapped.score, 8.2);
  assert.equal(mapped.riskLevel, 'low');
  assert.equal(mapped.price, 100);
  assert.equal(mapped.secMetricsIncluded, true);
  assert.equal(mapped.stale, false);
});
test('insufficient evidence is not rescued by the older raw risk input', () => {
  const mapped = mapSavedStock('X', {risk: {riskScore: 2}}, {
    data: {
      scores: {
        risk: {
          score: 2,
          coverage: 0,
          components: {}
        }
      },
      metrics: {}
    }
  }, NOW);
  assert.equal(mapped.riskScore, null);
  assert.equal(mapped.riskLevel, null);
  assert.equal(mapped.stale, true);
});
test('0–100 screener scores are not treated as 1–10 scorecards', () => {
  const mapped = mapSavedStock('X', {}, {
    data: {
      scores: {
        quality: {
          score: 80,
          coverage: 1,
          components: {a: {score: 8}}
        }
      },
      metrics: {}
    }
  }, NOW);
  assert.equal(mapped.scores.quality, null);
});
test('old cached prices remain explicitly stale', () => {
  const mapped = mapSavedStock('X', {preparedAt: '2025-01-01T00:00:00Z'}, {calculatedAt: NOW, data: {scores: {}, metrics: {price: 1}}}, NOW);
  assert.equal(mapped.stale, true);
});
test('future-dated or aging cached values are marked stale at response time', () => {
  assert.equal(savedDataIsStale('2026-09-28T00:00:00Z', '2026-09-29T00:00:00Z', NOW), true);
  assert.equal(savedDataIsStale('2026-09-27T00:00:00Z', '2026-09-27T00:00:00Z', NOW + 9 * 86400000), true);
});
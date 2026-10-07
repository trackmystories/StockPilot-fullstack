import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateWeightedScore, gateComposite} from './scoring';
import {supplementSecMetrics, type SavedSecEvidence} from './sec-score-inputs';
import {calculateScorecard} from './calculate-scorecard';
import type {StockIntelligenceMetrics, FmpFinancialStatements} from './types';

const input = (name: string, score: number | null, weight: number) => ({
  name,
  score,
  weight,
  rawValue: score,
});
test('partial weighted scores renormalize available weights and retain coverage', () => {
  const result = calculateWeightedScore([
    input('a', 8, 0.4),
    input('b', 4, 0.3),
    input('c', null, 0.3),
  ]);
  assert.equal(result.score, 6.3);
  assert.equal(result.coverage, 0.7);
  assert.equal(result.eligible, true);
  assert.ok(result.reasons?.includes('partial_evidence_score'));
});
test('one surviving component or insufficient coverage cannot produce a broad score', () => {
  assert.equal(calculateWeightedScore([input('a', 8, 0.8), input('b', null, 0.2)]).score, null);
  assert.equal(
    calculateWeightedScore([input('a', 8, 0.2), input('b', 5, 0.2), input('c', null, 0.6)]).score,
    null,
  );
  assert.equal(calculateWeightedScore([]).score, null);
});
test('complete results and genuine single-component models retain their scores', () => {
  assert.equal(calculateWeightedScore([input('a', 8, 0.5), input('b', 4, 0.5)]).score, 6);
  assert.equal(calculateWeightedScore([input('a', 3, 1)]).score, 3);
});
test('composites still require their essential assessments', () => {
  const complete = calculateWeightedScore([input('a', 8, 1)]);
  const missing = calculateWeightedScore([input('a', null, 1)]);
  assert.equal(gateComposite(complete, [missing]).score, null);
  assert.equal(gateComposite(complete, [complete]).score, 8);
});
function fixture(): {metrics: StockIntelligenceMetrics; saved: SavedSecEvidence} {
  const metrics = {
    currentRatio: null,
    debtToEquity: null,
    cashToShortTermDebt: null,
    dataQuality: {
      asOf: '2026-06-30',
      reportedCurrency: 'USD',
      statementAgeDays: 60,
      priceAgeDays: 1,
    },
  } as StockIntelligenceMetrics;
  return {
    metrics,
    saved: {
      cik: '0000000001',
      fingerprint: 'fixture',
      evidence: [
        {
          id: 'balance',
          quote:
            'Consolidated balance sheets with reported current assets and current liabilities.',
          context: 'Consolidated balance sheets. USD in millions',
          section: 'Financial statements',
          block: 1,
          attribution: 'issuer_disclosure',
          interpretation: 'source_excerpt_not_independently_verified',
          table:
            ' | June 30, 2026 | December 31, 2025\nTotal current assets | 200 | 150\nTotal current liabilities | 100 | 100',
          source: {
            cik: '0000000001',
            accession: '0000000001-26-000001',
            form: '10-Q',
            filedAt: '2026-08-01',
            reportDate: '2026-06-30',
            url: 'https://www.sec.gov/Archives/edgar/data/1/000000000126000001/report.htm',
            sha256: 'a'.repeat(64),
            rawPath: `sec/raw/${'a'.repeat(64)}.bin`,
          },
        },
      ],
    },
  };
}
test('saved SEC table fills a missing ratio and retains provenance', () => {
  const {metrics, saved} = fixture();
  supplementSecMetrics(metrics, saved, '2026-09-28');
  assert.equal(metrics.currentRatio, 2);
  assert.equal(metrics.secSupplement?.status, 'used');
  assert.equal(metrics.secSupplement?.facts[0].accession, saved.evidence[0].source.accession);
});
test('existing financial ratios are never replaced', () => {
  const {metrics, saved} = fixture();
  metrics.currentRatio = 1.2;
  supplementSecMetrics(metrics, saved, '2026-09-28');
  assert.equal(metrics.currentRatio, 1.2);
  assert.equal(metrics.secSupplement?.facts.length, 0);
});
test('wrong periods, currencies, future filings, ambiguous columns and conflicts are withheld', () => {
  for (const change of [
    (s: SavedSecEvidence) => {
      s.evidence[0].source.reportDate = '2025-06-30';
    },
    (s: SavedSecEvidence) => {
      s.evidence[0].context = 'Consolidated balance sheets. EUR in millions';
    },
    (s: SavedSecEvidence) => {
      s.evidence[0].source.filedAt = '2027-01-01';
    },
    (s: SavedSecEvidence) => {
      s.evidence[0].table += '\nTotal current assets | 50 | 50';
    },
    (s: SavedSecEvidence) => {
      s.evidence.push({
        ...s.evidence[0],
        id: 'conflict',
        table: s.evidence[0].table!.replace('200', '300'),
      });
    },
  ]) {
    const {metrics, saved} = fixture();
    change(saved);
    supplementSecMetrics(metrics, saved, '2026-09-28');
    assert.equal(metrics.currentRatio, null);
  }
});
test('overall cannot be generated from volatility alone', () => {
  const {metrics} = fixture();
  const card = calculateScorecard(
    'TEST',
    metrics,
    {riskScore: null, volatilityScore: 8, volatilityCoverage: 1},
    {
      symbol: 'TEST',
      income: [],
      balanceSheet: [],
      cashFlow: [],
    } as unknown as FmpFinancialStatements,
  );
  assert.equal(card.scores.overall.score, null);
});
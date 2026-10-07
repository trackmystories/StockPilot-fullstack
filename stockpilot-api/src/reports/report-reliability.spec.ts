import assert from 'node:assert/strict';
import {test} from 'node:test';
import {buildReport, reportFingerprint} from './report-builder';
import {emptyLayers} from '../sec-research/sec-research.types';
import type {ReportInput} from './report.types';

function fixture(): ReportInput {
  return {
    symbol: 'TEST',
    companyName: 'Test',
    sourceRunId: 'run',
    financial: {
      analysis: {
        fairValue: {
          eligible: true,
          estimatedFairValue: 20,
          currentPrice: 10,
          currency: 'USD',
          confidence: 'medium',
          methods: [
            {
              name: 'Peer sales',
              source: 'peer',
              impliedValue: 20,
              peerGroup: 'Software',
              peerCount: 22,
            },
          ],
        },
        peerComparison: {industry: 'Software'},
        earningsOutlook: {
          eligible: false,
          currentPeriod: '2026-12-31',
          nextPeriod: '2027-12-31',
          eps: {currentEstimate: -1, nextEstimate: -0.5},
          revenue: {currentEstimate: 0, nextEstimate: 10},
        },
        investmentCase: {
          strengths: [
            {
              key: 'peer-growth',
              source: 'peer-comparison',
              title: 'Best peers',
              evidence: 'This stock is the best.',
            },
            {
              key: 'fv',
              source: 'fair-value',
              title: 'Undervalued',
              evidence: 'This stock is undervalued.',
            },
          ],
          risks: [
            {key: 'risk-high', source: 'scorecard', title: 'Risk', evidence: 'Risk score 8.'},
          ],
        },
      },
    },
    scorecard: {
      data: {scores: {risk: {eligible: false, score: 8, direction: 'higher_is_riskier'}}},
    },
    sec: {metadata: null, layers: emptyLayers(), status: 'not_prepared'},
  };
}

test('unvalidated peer conclusions and ineligible score conclusions are withheld', () => {
  const report = buildReport(fixture());
  assert.equal(report.sections.find((s) => s.id === 'investment-case')!.statements.length, 0);
  assert.equal(report.sections.find((s) => s.id === 'scores')!.tables.length, 0);
  assert.ok(
    report.sections
      .find((s) => s.id === 'valuation')!
      .notes.some((n) => n.includes('comparability')),
  );
});

test('loss forecasts remain forecasts and zero estimates survive', () => {
  const section = buildReport(fixture()).sections.find((s) => s.id === 'earnings')!;
  assert.match(section.description, /forecasts/);
  assert.deepEqual(section.tables[0].rows, [
    ['EPS estimate', '-1.00', '-0.50'],
    ['Revenue estimate', '0.00', '10.00'],
  ]);
  assert.ok(section.notes.some((n) => n.includes('not enough evidence')));
});

test('metadata refresh timestamps do not trigger report rebuilding', () => {
  const a = fixture();
  a.sec.metadata = {fingerprint: 'abc', checkedAt: '2026-09-26', preparedAt: '2026-09-26'};
  const b = structuredClone(a);
  b.sec.metadata!.checkedAt = '2026-09-27';
  assert.equal(reportFingerprint(a), reportFingerprint(b));
  b.sec.metadata!.fingerprint = 'new';
  assert.notEqual(reportFingerprint(a), reportFingerprint(b));
});

test('unchanged SEC checkpoints preserve report fingerprint while successful re-extraction changes it', () => {
  const a = fixture();
  a.sec.status = 'prepared';
  a.sec.metadata = {
    fingerprint: 'same-filings',
    preparedAt: '2026-09-26T12:00:00Z',
    failedFilingCount: 1,
  };
  const b = structuredClone(a);
  b.sec.status = 'unchanged';
  assert.equal(reportFingerprint(a), reportFingerprint(b));
  b.sec.metadata!.preparedAt = '2026-09-27T12:00:00Z';
  b.sec.metadata!.failedFilingCount = 0;
  assert.notEqual(reportFingerprint(a), reportFingerprint(b));
});
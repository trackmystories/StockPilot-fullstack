require('./score-integrity-register.cjs');

const test = require('node:test');
const assert = require('node:assert/strict');
const {buildScoreCards} = require('../src/screens/StockPilotScoreCard/domain/scoreCardBuilders.ts');
const stock = {symbol: 'TEST', riskScore: 8, volatilityScore: 7};

test('missing prepared data never falls back to old navigation scores', () => {
  assert.equal(buildScoreCards({stock, intelligence: null}).find(x => x.id === 'risk').score, null);
});

test('preserves unavailable scores and backend metadata', () => {
  const intelligence = {scores: {risk: {score: null, direction: 'higher_is_riskier', coverage: 0.2, confidence: 'low', eligible: false, reasons: ['Missing evidence']}}};
  const card = buildScoreCards({stock, intelligence}).find(x => x.id === 'risk');
  assert.equal(card.score, null);
  assert.equal(card.coverage, 0.2);
  assert.equal(card.confidence, 'low');
  assert.deepEqual(card.reasons, ['Missing evidence']);
});

test('preserves zero and uses server direction', () => {
  const intelligence = {scores: {quality: {score: 0, direction: 'higher_is_riskier', coverage: 1, confidence: 'high'}}};
  const card = buildScoreCards({stock, intelligence}).find(x => x.id === 'quality');
  assert.equal(card.score, 0);
  assert.equal(card.direction, 'higher_is_riskier');
  assert.equal(buildScoreCards({stock, intelligence}).length, 30);
});

test('invalid numerical scores render as unavailable', () => {
  const card = buildScoreCards({stock, intelligence: {scores: {risk: {score: NaN}}}}).find(x => x.id === 'risk');
  assert.equal(card.score, null);
});
test('API retains the not-prepared error code and returns prepared data unchanged', async () => {
  const {requestJson, ApiError} = require('../src/screens/Auth/infrastructure/http.ts');
  const originalFetch = global.fetch;
  const originalUrl = process.env.EXPO_PUBLIC_API_URL;
  process.env.EXPO_PUBLIC_API_URL = 'http://localhost:4001';
  try {
    global.fetch = async () => ({ok: false, status: 404, json: async () => ({code: 'INTELLIGENCE_NOT_PREPARED', message: 'Not ready'})});
    await assert.rejects(requestJson('/api/stocks/TEST/intelligence'), error => error instanceof ApiError && error.code === 'INTELLIGENCE_NOT_PREPARED' && error.status === 404);
    const prepared = {symbol: 'TEST', sourceRunId: 'run-100', stale: true, scores: {risk: {score: null}}};
    global.fetch = async () => ({ok: true, json: async () => prepared});
    assert.deepEqual(await requestJson('/api/stocks/TEST/intelligence'), prepared);
  } finally {
    global.fetch = originalFetch;
    if (originalUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
    else process.env.EXPO_PUBLIC_API_URL = originalUrl;
  }
});

test('legacy partial numeric ratings are withheld',()=>{const cards=buildScoreCards({stock,intelligence:{scores:{quality:{score:9,coverage:.6,confidence:'low'}}}});assert.equal(cards.find(c=>c.id==='quality').score,null);});


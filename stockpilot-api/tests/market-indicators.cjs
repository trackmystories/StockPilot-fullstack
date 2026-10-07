const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const {test} = require('node:test');
require.extensions['.ts'] = (module, filename) => {
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true},
  });
  module._compile(compiled.outputText, filename);
};
const {MarketIndicatorsService, parseIndex, parseTreasury} = require('../src/mobile/market-indicators.service.ts');
const now = Date.parse('2026-09-25T18:00:00Z');
const definition = {id:'sp500', symbol:'^GSPC', label:'S&P 500', valueUnit:'points', changeUnit:'percent', colorMode:'directional'};
test('index quotes use exact symbols and preserve zero percent changes', () => {
  const item = parseIndex(definition, [{symbol:'^GSPC', price:6000, changePercentage:0, timestamp:now/1000}], now);
  assert.equal(item.status,'available'); assert.equal(item.direction,'flat'); assert.equal(item.change,0);
  assert.equal(item.asOf, new Date(now).toISOString());
  assert.equal(parseIndex(definition,[{symbol:'SPY',price:600}],now).value,null);
});

test('missing and invalid values are not fabricated; unknown timestamp stays null', () => {
  assert.equal(parseIndex(definition,[{symbol:'^GSPC',price:null}],now).status,'unavailable');
  assert.equal(parseIndex(definition,[{symbol:'^GSPC',price:Infinity}],now).status,'unavailable');
  const item=parseIndex(definition,[{symbol:'^GSPC',price:6000}],now);
  assert.equal(item.change,null);assert.equal(item.asOf,null);
  assert.equal(parseIndex(definition,[{symbol:'^GSPC',price:6000,timestamp:(now+600000)/1000}],now).status,'unavailable');
});

test('index percentage change derives from valid previous close only', () => {
  assert.equal(parseIndex(definition,[{symbol:'^GSPC',price:110,previousClose:100}],now).change,10);
  assert.equal(parseIndex(definition,[{symbol:'^GSPC',price:110,previousClose:0}],now).change,null);
});

test('Treasury observations are sorted by date and percentage points become basis points', () => {
  const item=parseTreasury([{date:'2026-09-23',year10:4.25},{date:'2026-09-25',year10:4.30}],now);
  assert.equal(item.value,4.30);assert.equal(item.change,5);assert.equal(item.changeUnit,'basis_points');
  assert.equal(item.asOf,'2026-09-25');assert.equal(item.previousAsOf,'2026-09-23');
  assert.equal(item.changeBasis,'previous_observation');assert.equal(item.colorMode,'neutral');
});

test('Treasury missing observations, invalid dates, conflicts and zeros are handled explicitly', () => {
  assert.equal(parseTreasury([{date:'2026-09-25',year10:0}],now).value,0);
  assert.equal(parseTreasury([{date:'2026-09-25',year10:4}],now).change,null);
  assert.equal(parseTreasury([{date:'2026-09-25',year10:null},{date:'2026-09-24',year10:4}],now).status,'unavailable');
  assert.equal(parseTreasury([{date:'2026-09-25',year10:4},{date:'2026-09-25',year10:5}],now).reason,'invalid_data');
  assert.equal(parseTreasury([{date:'2026-02-30',year10:4},{date:'2026-09-26',year10:4}],now).value,null);
});

test('concurrent callers share requests; failures are isolated and response order is stable', async () => {
  let calls=0;
  const service=new MarketIndicatorsService({get: async (endpoint,params) => {
    calls++;
    if(params.symbol==='^RUT')throw Object.assign(new Error('restricted'),{upstreamStatus:402});
    if(endpoint==='treasury-rates')return [{date:'2026-09-24',year10:4.3},{date:'2026-09-23',year10:4.25}];
    return [{symbol:params.symbol,price:100,changePercentage:-1,timestamp:Date.now()/1000}];
  }});
  const [first,second]=await Promise.all([service.getIndicators(),service.getIndicators()]);
  assert.equal(calls,6); assert.deepEqual(first,second);assert.equal(first.availableCount,5);
  assert.deepEqual(first.items.map(x=>x.id),['sp500','nasdaq','dow','russell2000','vix','us10y']);
  assert.equal(first.items[3].reason,'access_restricted');assert.equal(first.items[4].colorMode,'neutral');
  await service.getIndicators();assert.equal(calls,6);
  service.cached.expiresAt=0;await service.getIndicators();assert.equal(calls,12);
});

test('a complete provider outage returns explicit unavailable entries with no prices', async () => {
  const service=new MarketIndicatorsService({get:async()=>{throw Error('offline')}});
  const result=await service.getIndicators();assert.equal(result.availableCount,0);assert.equal(result.items.length,6);
  assert(result.items.every(x=>x.value===null && x.reason==='upstream_error'));
});

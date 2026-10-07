import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalizeStatements, normalizeEstimates, normalizeSnapshot, aggregateMinutes, normalizeProfile} from './normalizers';
const statement = (sections: Record<string, unknown>, currency = 'USD') => ({metadata: {ticker: 'TEST', frequency: 'Quarter', currency}, data: {group: {sections}}});
const metric = (slug: string, raw: unknown, date = '2026-03-28', datatype = 'int') => ({metadata: {slug, datatype}, values: [{date, normalizedDate: '2026-03-31', periodType: 'Quarter', reportedValue: {raw, fmt: 'ignored'}}]});
test('statement mapping preserves real dates, fiscal calendar, currency, zero and missing data', () => {
  const rows = normalizeStatements(statement({a: metric('revenue', 120), b: metric('operating-income', 0), c: metric('eps-basic', null)}), 'TEST', 'IS', 'quarter', '0926');
  assert.equal(rows[0].date, '2026-03-28');
  assert.equal(rows[0].period, 'Q2');
  assert.equal(rows[0].fiscalYear, 2026);
  assert.equal(rows[0].revenue, 120);
  assert.equal(rows[0].operatingIncome, 0);
  assert.equal(rows[0].eps, null);
  assert.equal(rows[0].reportedCurrency, 'USD');
  assert.equal(rows[0].netIncome, null);
});
test('cash flow derives FCF and net issuance only from complete components', () => {
 const rows = normalizeStatements(statement({a:metric('cash-from-operating-activities',100),b:metric('capital-expenditure',-30)}),'TEST','CF','quarter');
 assert.equal(rows[0].freeCashFlow,70);
 assert.equal(rows[0].netCommonStockIssuance,null);
});
test('balance sheet derives debt only when both components are present', () => {
 const rows=normalizeStatements(statement({a:metric('short-term-debt',20),b:metric('long-term-debt',80),c:metric('cash-and-equivalents',30)}),'TEST','BS','quarter');
 assert.equal(rows[0].totalDebt,100);assert.equal(rows[0].netDebt,70);
 const missing=normalizeStatements(statement({a:metric('short-term-debt',20)}),'TEST','BS','quarter');
 assert.equal(missing[0].totalDebt,null);
});
test('ratio percentages convert once; unknown metrics are never fuzzy matched', () => {
 const rows=normalizeStatements(statement({a:metric('net-margin',25,'2026-03-28','%'),b:metric('current-ratio',2),c:metric('total-assets-growth',900)}),'TEST','Ratios','quarter');
 assert.equal(rows[0].netProfitMargin,0.25);assert.equal(rows[0].currentRatio,2);assert.equal(rows[0].totalAssets,undefined);
});
test('estimates retain fiscal labels rather than inventing calendar end dates or analyst counts', () => {
 const make=(n:number)=>({metadata:{ticker:'TEST'},data:[{dimension:'quarter',estimates:[{period:'Q1 27',data_type:'estimate',value_estimate:n}]}]});
 const rows=normalizeEstimates(make(500),make(2),'TEST','quarter');
 assert.equal(rows[0].periodLabel,'Q1 27');assert.equal(rows[0].date,null);assert.equal(rows[0].fiscalYear,2027);
 assert.equal(rows[0].isForecast,true);assert.equal(rows[0].revenueAvg,500);assert.equal(rows[0].epsAvg,2);
 assert.equal(rows[0].numAnalystsEps,null);assert.equal(rows[0].currency,null);
});
test('snapshot respects explicit timestamp and maps daily changes', () => {
 const rows=normalizeSnapshot([{ticker:'TEST',price:105,pricechange:5,pricechange_pct:5,pricedate:'2026-09-28T20:00:00Z'}],'TEST');
 assert.equal(rows[0].previousClose,100);assert.equal(rows[0].timestamp,Date.parse('2026-09-28T20:00:00Z')/1000);
 assert.equal(rows[0].marketCap,null);
 assert.throws(()=>normalizeSnapshot({error:'denied'},'TEST'),/snapshot/);
});
test('minute aggregation differences cumulative volume and resets between sessions', () => {
 const bar=(date:string,volume:number,close:number)=>({date,volume,open:close,high:close,low:close,close});
 const rows=aggregateMinutes([bar('2026-09-28 09:30:00',100,10),bar('2026-09-28 09:31:00',160,11),bar('2026-09-28 09:35:00',200,12),bar('2026-09-29 09:30:00',50,13)],5);
 assert.equal(rows[0].volume,50);assert.equal(rows[1].volume,40);assert.equal(rows[2].volume,160);
 assert.equal(rows[2].open,10);assert.equal(rows[2].close,11);
});
test('profile does not claim first recorded price date is an IPO date', () => {
 const row=normalizeProfile({ticker:'TEST',name:'Test',firstpricedate:'1980-01-01'},'TEST');
 assert.equal(row.ipoDate,null);assert.equal(row.image,null);assert.equal(row.currency,null);
});
test('non-dollar statements retain currency and do not substitute profit-after-tax for missing net income',()=>{
 const [row]=normalizeStatements(statement({a:metric('revenue',100),b:metric('profit-after-tax',20)},'EUR'),'TEST','IS','quarter','1231');
 assert.equal(row.reportedCurrency,'EUR');assert.equal(row.netIncome,null);
});
test('invalid statement identity, conflicting observations and wrong frequency are rejected or omitted',()=>{
 assert.throws(()=>normalizeStatements({metadata:{ticker:'OTHER'},data:{}},'TEST','IS','quarter'),/Invalid/);
 assert.throws(()=>normalizeStatements(statement({a:metric('revenue',100),b:metric('revenue',200)}),'TEST','IS','quarter'),/Conflicting/);
 const annual=metric('revenue',100);annual.values[0].periodType='Annual';
 assert.deepEqual(normalizeStatements(statement({annual}),'TEST','IS','quarter'),[]);
});

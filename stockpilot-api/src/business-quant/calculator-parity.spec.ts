import assert from 'node:assert/strict';
import {test} from 'node:test';
import {normalizeStatements, type Row} from './normalizers';
import {buildScorecardMetrics} from '../intelligence/scorecard-metrics';
import {intelligenceCalculators} from '../intelligence/calculators/calculator.registry';
import type {IntelligenceCalculatorInput} from '../intelligence/calculators/calculator.type';
const dates=Array.from({length:16},(_,i)=>new Date(Date.UTC(2026,6-i*3,0)).toISOString().slice(0,10));
function payload(metrics: Record<string,number>, growth=0) {
 const sections=Object.fromEntries(Object.entries(metrics).map(([slug,value])=>[slug,{metadata:{slug,datatype:'int'},values:dates.map((date,i)=>({date,periodType:'Quarter',reportedValue:{raw:value*(1-growth*i)}}))}]));
 return {metadata:{ticker:'TEST',currency:'USD',frequency:'Quarter'},data:{group:{sections}}};
}
test('all registered calculators produce identical outputs from equivalent provider inputs',()=>{
 const income=payload({revenue:1000,'gross-profit':600,'operating-income':300,'income-towards-parent-company':200,ebitda:350,'eps-basic':2,'eps-weighted-average-and-diluted':1.9,'tax-provisions':50,ebt:250,'interest-expenses':10,'shares-outstanding-weighted-average':100},0.01);
 const balance=payload({'total-assets':2000,'total-current-assets':800,'total-current-liabilities':400,'total-stockholders-equity':1200,'cash-and-equivalents':200,'total-debt':300,'short-term-debt':50});
 const cash=payload({'cash-from-operating-activities':250,'capital-expenditure':-50,'stock-based-compensation':10,'net-common-stock-issuance':0},0.01);
 const normalized={symbol:'TEST',income:normalizeStatements(income,'TEST','IS','quarter','1231'),balanceSheet:normalizeStatements(balance,'TEST','BS','quarter','1231'),cashFlow:normalizeStatements(cash,'TEST','CF','quarter','1231')};
 const native={symbol:'TEST',income:dates.map((date,i)=>({date,period:`Q${Math.ceil(Number(date.slice(5,7))/3)}`,reportedCurrency:'USD',revenue:1000*(1-.01*i),grossProfit:600*(1-.01*i),operatingIncome:300*(1-.01*i),netIncome:200*(1-.01*i),ebitda:350*(1-.01*i),eps:2*(1-.01*i),epsDiluted:1.9*(1-.01*i),incomeTaxExpense:50*(1-.01*i),incomeBeforeTax:250*(1-.01*i),interestExpense:10*(1-.01*i),weightedAverageShsOut:100*(1-.01*i)})),
  balanceSheet:dates.map(date=>({date,period:'Q1',reportedCurrency:'USD',totalAssets:2000,totalCurrentAssets:800,totalCurrentLiabilities:400,totalStockholdersEquity:1200,cashAndCashEquivalents:200,totalDebt:300,shortTermDebt:50,netDebt:100})),
  cashFlow:dates.map((date,i)=>({date,period:'Q1',reportedCurrency:'USD',operatingCashFlow:250*(1-.01*i),capitalExpenditure:-50*(1-.01*i),freeCashFlow:250*(1-.01*i)-Math.abs(-50*(1-.01*i)),stockBasedCompensation:10*(1-.01*i),netCommonStockIssuance:0}))};
 const quote={price:20,marketCap:2000,currency:'USD'};
 const now=Date.parse('2026-07-10');
 const left=buildScorecardMetrics(native,quote,{},[],null,now);
 const right=buildScorecardMetrics(normalized,quote,{},[],null,now);
 assert.deepEqual(right,left);
 assert.equal(right.currentRatio,2);assert.equal(right.netDebt,100);
 const make=(financials:typeof native|typeof normalized,metrics:typeof left):IntelligenceCalculatorInput=>({symbol:'TEST',financials,metrics,momentum:null,estimates:null,company:{symbol:'TEST',companyName:'Test Inc',marketCap:2000,price:20,volume:null,sector:'Technology',industry:'Software',exchange:'NASDAQ',country:'US',currency:'USD'}});
 const original=make(native,left),migrated=make(normalized,right);
 for(const calculator of intelligenceCalculators) assert.deepEqual(calculator.calculate(migrated),calculator.calculate(original),calculator.id);
});
test('uncertain price history cannot quietly produce momentum after a cached rebuild',()=>{
 const history:Row[]=Array.from({length:300},(_,i)=>({date:new Date(Date.UTC(2026,8,28-i)).toISOString().slice(0,10),close:100+i,volume:1000,priceAdjustment:'unverified'}));
 const result=buildScorecardMetrics({symbol:'TEST',income:[],balanceSheet:[],cashFlow:[]},{price:100,currency:'USD'}, {},history);
 assert.equal(result.return1m,null);assert.equal(result.return12m,null);
 assert.ok(result.dataQuality?.warnings.includes('historical_price_adjustment_unverified'));
});

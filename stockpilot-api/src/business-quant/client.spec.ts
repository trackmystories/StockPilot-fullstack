import assert from 'node:assert/strict';
import {test} from 'node:test';
import {BusinessQuantClient, BusinessQuantError} from './client';
import {BusinessQuantAdapter} from './adapter';
import {stripLegacyAssets} from '../common/legacy-assets';
function makeClient(key = 'test-only-key') {
 const calls: {endpoint:string;params:Record<string,string>}[]=[];
 const client=new BusinessQuantClient({apiKey:()=>key,run:request=>request(),cache:async(endpoint,params,_ttl,load)=>{calls.push({endpoint,params});return load();}});
 return {client,calls};
}
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
test('transport exclusively uses Business Quant and keeps secrets out of persisted cache params',async(t)=>{
 const urls:URL[]=[];
 t.mock.method(globalThis,'fetch',async(input: string | URL | Request,init?:RequestInit)=>{urls.push(new URL(String(input)));assert.equal(init?.redirect,'error');return json([]);});
 const {client,calls}=makeClient();
 await client.request('quotes',{ticker:'TEST',mode:'snapshot'},60_000);
 assert.equal(urls[0].origin,'https://data.businessquant.com');assert.equal(urls[0].searchParams.get('api_key'),'test-only-key');
 assert.ok(calls[0].endpoint.startsWith('business-quant:v1:'));
 assert.ok(!JSON.stringify(calls).includes('test-only-key'));
 await assert.rejects(()=>client.request('https://financialmodelingprep.com/stable/quote',{},1),/Unsupported/);
});
test('missing key makes no outbound request',async(t)=>{
 let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return json([]);});
 await assert.rejects(()=>makeClient('').client.request('quotes',{},1),/BUSINESS_QUANT_API_KEY/);assert.equal(calls,0);
});
test('401, 403, 429 and malformed responses fail; only 404 is missing optional coverage',async(t)=>{
 let status=401;t.mock.method(globalThis,'fetch',async()=>json({error:'example'},status));
 const {client}=makeClient();
 for(const code of [401,403,429,500]){status=code;await assert.rejects(()=>client.optional('quotes',{ticker:'TEST'},1),(error:unknown)=>error instanceof BusinessQuantError&&error.upstreamStatus===code);}
 status=404;assert.equal(await client.optional('quotes',{},1),null);
 status=200;await assert.rejects(()=>client.request('quotes',{},1),/Invalid/);
});
test('pagination collects every page and rejects changing totals or wrong pages',async(t)=>{
 let bad=false;
 t.mock.method(globalThis,'fetch',async(input:string|URL|Request)=>{const page=Number(new URL(String(input)).searchParams.get('page'));return json({metadata:{pagination:{current_page:page,total_pages:bad&&page===2?3:2}},data:[{date:`2026-01-0${page}`,close:page}]});});
 const {client}=makeClient();assert.equal((await client.pages('quotes',{ticker:'TEST'},1)).length,2);
 bad=true;await assert.rejects(()=>client.pages('quotes',{ticker:'TEST'},1),/pagination changed/);
});
test('adapter maps provider snapshots, market cap and daily bars to the existing quote contract',async(t)=>{
 const paths:string[]=[];
 t.mock.method(globalThis,'fetch',async(input:string|URL|Request)=>{
  const u=new URL(String(input));paths.push(u.pathname);
  if(u.pathname==='/historic')return json([{ticker:'TEST',date:'2026-09-27',value:900},{ticker:'TEST',date:'2026-09-28',value:1000}]);
  if(u.searchParams.get('mode')==='snapshot')return json([{ticker:'TEST',name:'Test Inc',exchange:'NASDAQ',price:11,pricechange:1,pricechange_pct:10,pricedate:'2026-09-28T20:00:00Z'}]);
  return json({metadata:{ticker:'TEST'},data:[{date:'2026-09-28 16:00:00',open:10,high:12,low:9,close:11,volume:42}]});
 });
 const adapter=new BusinessQuantAdapter(makeClient().client,()=>undefined);
 const [quote]=await adapter.get('quote',{symbol:'TEST'});
 assert.equal(quote.price,11);assert.equal(quote.marketCap,1000);assert.equal(quote.currency,'USD');assert.equal(quote.volume,42);assert.equal(quote.previousClose,10);
 assert.equal(paths.length,3);
 assert.deepEqual(await adapter.get('ratings-snapshot',{symbol:'TEST'}),[]);
 assert.deepEqual(await adapter.get('quote',{symbol:'^GSPC'}),[]);
 assert.deepEqual(await adapter.get('treasury-rates',{}),[]);
 assert.equal(paths.length,3);
});
test('history records adjustment uncertainty until explicitly configured',async(t)=>{
 t.mock.method(globalThis,'fetch',async()=>json({metadata:{ticker:'TEST',pagination:{current_page:1,total_pages:1}},data:[{date:'2026-09-28 16:00:00',close:20}]}));
 const client=makeClient().client;
 const [unknown]=await new BusinessQuantAdapter(client,()=>undefined).get('historical-price-eod/full',{symbol:'TEST'});
 assert.equal(unknown.priceAdjustment,'unverified');assert.equal(unknown.adjClose,null);
 const [verified]=await new BusinessQuantAdapter(client,()=>'split_adjusted').get('historical-price-eod/full',{symbol:'TEST'});
 assert.equal(verified.adjClose,20);
});
test('legacy image URLs are removed from nested saved records without changing safe assets',()=>{
 const data={items:[{logoUrl:'https://images.financialmodelingprep.com/symbol/AAPL.png',price:100},{image:'https://storage.googleapis.com/my-bucket/logo.png'}],old:'https://fmpcloud.io/logo.png'};
 assert.deepEqual(stripLegacyAssets(data),{items:[{logoUrl:null,price:100},{image:'https://storage.googleapis.com/my-bucket/logo.png'}],old:null});
 assert.equal(data.items[0].logoUrl,'https://images.financialmodelingprep.com/symbol/AAPL.png');
});
test('universe search shares a provider universe and uses POST for the screener',async(t)=>{
 let requests=0;
 t.mock.method(globalThis,'fetch',async(input:string|URL|Request,init?:RequestInit)=>{
  requests++;const url=new URL(String(input));
  if(url.pathname==='/universe')return json({metadata:{},data:[{ticker:'AAA',security_type:'Equity',name:'Alpha',exchange:'NASDAQ'},{ticker:'BBB',security_type:'Equity',name:'Beta',exchange:'NYSE'},{ticker:'ETF',security_type:'ETF',name:'Fund'}]});
  assert.equal(url.pathname,'/screener');assert.equal(init?.method,'POST');
  assert.deepEqual(JSON.parse(String(init?.body)).preferred_columns,['Market Capitalization']);
  return json({metadata:{page:1,total_pages:1},data:[{ticker:'AAA','Market Capitalization':1000}]});
 });
 const adapter=new BusinessQuantAdapter(makeClient().client,()=>undefined);
 const [screen,name]=await Promise.all([adapter.get('company-screener',{limit:'1000',page:'0'}),adapter.get('search-name',{query:'Alpha'})]);
 assert.equal(screen.length,1);assert.equal(name[0].symbol,'AAA');assert.equal(requests,2);
});

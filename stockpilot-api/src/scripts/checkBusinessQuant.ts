/** Read-only smoke check. Does not connect to Firebase, run jobs, or publish scores. */
import {existsSync, readFileSync} from 'node:fs';
import {BusinessQuantAdapter} from '../business-quant/adapter';
import {BusinessQuantClient} from '../business-quant/client';
function setting(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  if (!existsSync('.env')) return undefined;
  const line=readFileSync('.env','utf8').split(/\r?\n/).find((line)=>new RegExp(`^\\s*(?:export\\s+)?${name}\\s*=`).test(line));
  return line?.slice(line.indexOf('=')+1).trim().replace(/^(['"])(.*)\1$/, '$2');
}
async function main() {
  const symbol=(process.argv[2]??'AAPL').trim().toUpperCase();
  const cache=new Map<string,Promise<unknown>>();
  let queue:Promise<void>=Promise.resolve();
  let requests=0;
  const client=new BusinessQuantClient({apiKey:()=>setting('BUSINESS_QUANT_API_KEY'),
    cache:<T>(endpoint:string,params:Record<string,string>,_ttl:number,load:()=>Promise<T>)=>{
      const id=JSON.stringify([endpoint,params]);
      if(!cache.has(id))cache.set(id,load());
      return cache.get(id) as Promise<T>;
    },
    run:(request)=>{
      const result=queue.then(async()=>{requests++;return request();});
      queue=result.then(()=>new Promise<void>(resolve=>setTimeout(resolve,1000)),()=>undefined);
      return result;
    }});
  const provider=new BusinessQuantAdapter(client,()=>setting('BUSINESS_QUANT_HISTORY_BASIS'));
  const checks=['profile','quote','income-statement','balance-sheet-statement','cash-flow-statement','ratios','analyst-estimates'];
  let missing=0;
  for(const endpoint of checks){
    const rows=await provider.get(endpoint,{symbol,period:'quarter',limit:'16'});
    const populated=Object.entries(rows[0]??{}).filter(([,value])=>value!==null&&value!==undefined).map(([key])=>key);
    console.log(`${endpoint}: ${rows.length} rows; populated fields: ${populated.join(', ')||'none'}`);
    if(!rows.length)missing++;
    if(endpoint==='income-statement') console.log(`  Latest revenue=${rows[0]?.revenue??'missing'}, net income=${rows[0]?.netIncome??'missing'}, currency=${rows[0]?.reportedCurrency??'missing'}`);
    if(endpoint==='balance-sheet-statement') console.log(`  Latest assets=${rows[0]?.totalAssets??'missing'}, equity=${rows[0]?.totalStockholdersEquity??'missing'}, debt=${rows[0]?.totalDebt??'missing'}`);
    if(endpoint==='cash-flow-statement') console.log(`  Latest operating cash flow=${rows[0]?.operatingCashFlow??'missing'}, FCF=${rows[0]?.freeCashFlow??'missing'}`);
  }
  const to=new Date().toISOString().slice(0,10),from=new Date(Date.now()-7*86_400_000).toISOString().slice(0,10);
  const history=await provider.get('historical-price-eod/full',{symbol,from,to});
  console.log(`History: ${history.length} observations; adjustment basis=${history[0]?.priceAdjustment??'missing'}`);
  console.log(`Completed ${requests} Business Quant requests. No Firebase writes or universe refresh performed.`);
  if(missing||!history.length){console.error('Some endpoints have no coverage; inspect the results before a full refresh.');process.exitCode=1;}
}
main().catch((error:unknown)=>{console.error(error instanceof Error?error.message:'Business Quant check failed.');process.exitCode=1;});

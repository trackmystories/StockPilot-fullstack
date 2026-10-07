import {BusinessQuantClient, BusinessQuantError} from './client';
import {aggregateMinutes, dateOnly, normalizeEstimates, normalizeProfile, normalizeSnapshot, normalizeStatements, number, object, text, type Row} from './normalizers';
const HOUR = 3_600_000;
const STATEMENTS: Record<string,string> = {'income-statement':'IS','balance-sheet-statement':'BS','cash-flow-statement':'CF',ratios:'Ratios'};
export class BusinessQuantAdapter {
  private universePromise: Promise<Row[]> | null = null;
  private universeCache: {expiresAt:number;rows:Row[]} | null = null;
  constructor(private readonly client: BusinessQuantClient, private readonly historyBasis: () => string | undefined) {}
  async get(endpoint: string, params: Record<string,string> = {}): Promise<Row[]> {
    const symbol = (params.symbol ?? '').trim().toUpperCase();
    if (['price-target-consensus','ratings-snapshot','treasury-rates'].includes(endpoint)) return [];
    if (endpoint === 'company-screener') {
      const rows = await this.universe();
      const limit = this.limit(params.limit,1000), page = Math.max(0,Number(params.page) || 0);
      return rows.slice(page*limit,(page+1)*limit);
    }
    if (endpoint === 'search-symbol' || endpoint === 'search-name') {
      const query = (params.query ?? '').trim().toUpperCase();
      if (!query) return [];
      const rows = await this.universe();
      return rows.filter((row) => String(endpoint === 'search-symbol' ? row.symbol : row.companyName).toUpperCase().includes(query))
        .sort((a,b) => Number(String(b.symbol)===query)-Number(String(a.symbol)===query) || String(a.symbol).localeCompare(String(b.symbol)))
        .slice(0,this.limit(params.limit,15)).map((row) => ({...row,name:row.companyName,exchangeFullName:row.exchange,currency:null}));
    }
    if (symbol.startsWith('^')) return [];
    if (!/^[A-Z0-9][A-Z0-9.^-]{0,19}$/.test(symbol)) throw new BusinessQuantError('Invalid stock symbol.',400);
    // The documented feed covers equities/ETFs, not FMP's synthetic index symbols.
    if (symbol.startsWith('^')) return [];
    if (endpoint === 'profile') return [await this.profile(symbol)];
    if (STATEMENTS[endpoint]) {
      const frequency = params.period === 'annual' ? 'annual' : 'quarter';
      const [payload, profile] = await Promise.all([
        this.client.optional('statements',{ticker:symbol,statement:STATEMENTS[endpoint],frequency:frequency==='annual'?'Annual':'Quarter',period:'5y'},24*HOUR),
        this.profile(symbol),
      ]);
      return payload === null ? [] : normalizeStatements(payload,symbol,STATEMENTS[endpoint],frequency,text(profile.fiscalYearEnd) ?? undefined).slice(0,this.limit(params.limit,16));
    }
    if (endpoint === 'analyst-estimates') {
      const [revenue,eps] = await Promise.all(['revenue','eps'].map((mode) => this.client.optional('estimates',{ticker:symbol,mode},6*HOUR)));
      return normalizeEstimates(revenue,eps,symbol,params.period==='quarter'?'quarter':'annual');
    }
    if (endpoint === 'quote') return this.quote(symbol);
    if (endpoint === 'historical-price-eod/full') return this.history(symbol,params);
    if (endpoint === 'historical-chart/5min' || endpoint === 'historical-chart/1hour') {
      const bounds = this.bounds(params,'7d');
      try {
        const rows = await this.client.pages('quotes',{ticker:symbol,mode:'minute-bars',...bounds},60_000);
        return aggregateMinutes(rows,endpoint.endsWith('5min')?5:60);
      } catch (error) { if (error instanceof BusinessQuantError && error.upstreamStatus===404) return []; throw error; }
    }
    throw new BusinessQuantError(`No Business Quant mapping for ${endpoint}.`,503);
  }
  private async profile(symbol: string): Promise<Row> {
    const payload = await this.client.optional('stocks/profile',{ticker:symbol},24*HOUR);
    if (payload === null) return {symbol,companyName:null,marketCap:null,currency:null,image:null,source:'Business Quant'};
    return normalizeProfile(payload,symbol);
  }
  private async quote(symbol: string): Promise<Row[]> {
    const payload = await this.client.optional('quotes',{ticker:symbol,mode:'snapshot'},60_000);
    if (payload === null) return [];
    const quotes = normalizeSnapshot(payload,symbol);
    if (!quotes.length) return [];
    // Market cap is a separate Business Quant metric; never estimate it from diluted share counts.
    const cap = await this.client.optional('historic',{ticker:symbol,slug:'market-capitalization',mode:'original',period:'1mo',limit:'100'},HOUR);
    if (cap !== null && !Array.isArray(cap)) throw new BusinessQuantError('Invalid Business Quant market capitalization response.');
    const latestCap = (Array.isArray(cap)?cap:[]).map(object).filter((row) => text(row.ticker)?.toUpperCase()===symbol && dateOnly(row.date)).sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0];
    quotes[0].marketCap = number(latestCap?.value);
    quotes[0].marketCapAsOf = latestCap?.date ?? null;
    const daily = await this.client.optional('quotes',{ticker:symbol,mode:'daily',period:'7d',limit:'10',page:'1'},60_000);
    if (daily !== null) {
      const envelope = object(daily);
      if (text(object(envelope.metadata).ticker)?.toUpperCase() !== symbol || !Array.isArray(envelope.data)) throw new BusinessQuantError('Invalid Business Quant daily quote response.');
      const bar = envelope.data.map(object).filter((row)=>dateOnly(row.date)===dateOnly(quotes[0].asOf))
        .sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0];
      if (bar) Object.assign(quotes[0],{open:number(bar.open),dayHigh:number(bar.high),dayLow:number(bar.low),volume:number(bar.volume)});
    }
    // US exchange listings are USD quotes; reporting and estimate currencies remain separately sourced.
    const exchange = String(quotes[0].exchange ?? '').toUpperCase();
    quotes[0].currency = /^(NASDAQ|NYSE|NYSEARCA|NYSE ARCA|NYSEAMERICAN|NYSE AMERICAN|AMEX|CBOE|BATS|OTC|OTCMKTS|OTCQX|OTCQB|PINK)$/.test(exchange) ? 'USD' : null;
    return quotes;
  }
  private async history(symbol: string, params: Record<string,string>): Promise<Row[]> {
    let rows: Row[];
    try { rows = await this.client.pages('quotes',{ticker:symbol,mode:'eod',...this.bounds(params,'5y')},HOUR); }
    catch (error) { if (error instanceof BusinessQuantError && error.upstreamStatus===404) return []; throw error; }
    const basis = this.historyBasis()?.trim();
    // The public OHLCV schema does not specify adjustment semantics. Opt in only after provider confirmation.
    const verified = basis === 'split_adjusted';
    return rows.filter((row)=>dateOnly(row.date) && number(row.close)!>0).map((row)=>({symbol,date:dateOnly(row.date),
      open:number(row.open),high:number(row.high),low:number(row.low),close:number(row.close),volume:number(row.volume),
      adjClose:verified?number(row.close):null,priceAdjustment:verified?'split_adjusted':'unverified',source:'Business Quant'}))
      .sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  }
  private async universe(): Promise<Row[]> {
    if (this.universeCache && this.universeCache.expiresAt>Date.now()) return this.universeCache.rows;
    if (this.universePromise) return this.universePromise;
    this.universePromise=this.loadUniverse();
    try { const rows=await this.universePromise;this.universeCache={rows,expiresAt:Date.now()+6*HOUR};return rows; }
    finally { this.universePromise=null; }
  }
  private async loadUniverse(): Promise<Row[]> {
    const [payload,screened] = await Promise.all([
      this.client.request('universe',{security_type:'Equity'},24*HOUR),
      this.client.pages('screener',{},6*HOUR,{conditions:'"Market Capitalization" > 0',preferred_columns:['Market Capitalization']}),
    ]);
    const data=object(payload).data;
    if (!Array.isArray(data)) throw new BusinessQuantError('Invalid Business Quant universe.');
    const byTicker=new Map(screened.map((row)=>[text(row.ticker)?.toUpperCase(),row]));
    return data.map(object).filter((row)=>row.security_type==='Equity' && byTicker.has(text(row.ticker)?.toUpperCase()))
      .flatMap((row)=>{
        const symbol=text(row.ticker)?.toUpperCase();
        if (!symbol || !/^[A-Z0-9][A-Z0-9.^-]{0,19}$/.test(symbol)) return [];
        return [{symbol,name:text(row.name),companyName:text(row.name_short)??text(row.name)??symbol,sector:text(row.sector),industry:text(row.industry),
          exchange:text(row.exchange),country:null,marketCap:number(byTicker.get(symbol)?.['Market Capitalization']),price:null,volume:null}];
      }).sort((a,b)=>a.symbol.localeCompare(b.symbol));
  }
  private limit(value: string | undefined, fallback: number): number { const parsed=Number(value);return Number.isSafeInteger(parsed)&&parsed>0?Math.min(parsed,10000):fallback; }
  private bounds(params: Record<string,string>, fallback: string): Record<string,string> {
    if (params.from || params.to) {
      if (!dateOnly(params.from) || !dateOnly(params.to)) throw new BusinessQuantError('Both from and to dates are required.',400);
      return {from_date:params.from,till_date:params.to};
    }
    return {period:fallback};
  }
}

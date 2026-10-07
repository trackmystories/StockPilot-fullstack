import {BadGatewayException, BadRequestException, Injectable, NotFoundException} from '@nestjs/common';
import {RequestCache} from '../common/request-cache';
import {FirebaseService} from '../firebase/firebase.service';
import {FmpHttpService} from '../fmp/clients/fmp-http.service';
import {FmpCompanyProfileService} from '../fmp/services/fmp-company-profile.service';
import {FmpQuoteService} from '../fmp/services/fmp-quote.service';
import {FmpStockSearchService} from '../fmp/services/fmp-stock-search.service';
import {PreparedStockRepository} from '../intelligence/repositories/prepared-stock.repository';
import {ScreenerResultsRepository} from '../intelligence/repositories/screener-results.repository';
import {parseEstimates, parseStatements} from './earnings.parsers';

type Row = Record<string, unknown>;
const number = (value: unknown): number | null =>
  value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
@Injectable()
export class MarketService {
  private readonly cache = new RequestCache(200);
  constructor(
    private readonly http: FmpHttpService,
    private readonly quotes: FmpQuoteService,
    private readonly profiles: FmpCompanyProfileService,
    private readonly searchService: FmpStockSearchService,
    private readonly firebase: FirebaseService,
    private readonly results: ScreenerResultsRepository,
    private readonly prepared: PreparedStockRepository,
  ) {}
  private symbol(value: string) {
    const symbol = value.trim().toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9.^-]{0,19}$/.test(symbol)) {
      throw new BadRequestException('Invalid stock symbol.');
    }
    return symbol;
  }
  async search(query: string) {
    if (typeof query !== 'string' || query.length > 100) {
      throw new BadRequestException('Invalid search query.');
    }
    return {results: await this.searchService.search(query)};
  }
  profile(symbol: string) {
    return this.profiles.getCompanyProfile(this.symbol(symbol));
  }
  getCatalog() {
    return this.cache.get('catalog', 60000, async () => {
      const page = await this.firebase.db.collection('stocks').get();
      return {stocks: page.docs.map((doc) => ({...doc.data(), id: doc.id}))};
    });
  }
  getFeatured() {
    return this.cache.get('featured', 60000, async () => {
      const page = await this.firebase.db.collection('stocks').where('featured', '==', true).get();
      const stocks = page.docs.map((doc) => ({...doc.data(), symbol: this.symbol(doc.get('symbol') ?? doc.id)}));
      const quotes = await this.quotes.getQuotes(stocks.map((stock) => stock.symbol));
      const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
      return {stocks: stocks.map((stock) => ({...stock, ...bySymbol.get(stock.symbol)}))};
    });
  }
  async getQuotes(values: string[]) {
    const symbols = [...new Set(values.map((value) => this.symbol(value)))];
    if (symbols.length > 50) {
      throw new BadRequestException('Request at most 50 symbols.');
    }
    return {quotes: symbols.length ? await this.quotes.getQuotes(symbols) : []};
  }
  getQuote(value: string) {
    return this.quotes.getQuote(this.symbol(value));
  }
  async getRisk(value: string) {
    const symbol = this.symbol(value);
    const stored = await this.prepared.getPrepared(symbol, 'intelligence');
    if (!stored?.risk)
      throw new NotFoundException({
        code: 'INTELLIGENCE_NOT_PREPARED',
        message: 'Risk analysis is not yet available for this stock.',
      });
    return {...stored.risk, sourceRunId: stored.sourceRunId, stale: stored.stale};
  }
  getFinanciallyStrong(page = 0, limit = 5) {
    return this.getMarketStocks('financially-strong', page, limit);
  }
  async getMarketStocks(id: string, page = 0, limit = 5) {
    const allowed = [
      'estimates-rising',
      'strong-momentum',
      'financially-strong',
      'high-quality',
      'high-growth',
      'undervalued',
      'strong-balance-sheet',
      'quality-near-lows',
      'quality-near-highs',
      'growth-near-lows',
      'oversold-quality',
      'undervalued-momentum',
      'small-cap-quality',
      'small-cap-growth',
      'low-cap-ai',
      'low-cap-ai-growth',
      'theme-ai',
      'theme-semiconductors',
      'theme-data-centers',
      'theme-energy',
      'theme-cybersecurity',
      'theme-robotics',
    ];
    if (!allowed.includes(id)) {
      throw new BadRequestException('Invalid screener.');
    }
    if (!Number.isInteger(page) || page < 0 || !Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new BadRequestException('Invalid pagination.');
    }
    const run = await this.results.getActiveRun();
    return this.cache.get(`screener:${run}:${id}:${page}:${limit}`, 60000, async () => {
      const result = await this.results.getResults(id, page, limit);
      const symbols = result.items.map((item) => this.symbol(item.symbol));
      if (!symbols.length) {
        return result;
      }
      const [snapshots, quotes] = await Promise.all([
        this.results.getStockSnapshots(symbols, result.runId),
        this.quotes.getQuotes(symbols).catch(() => []),
      ]);
      const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));
      return {
        ...result,
        items: result.items.map((item) => {
          const symbol = this.symbol(item.symbol);
          const snapshot = snapshots.get(symbol);
          const quote = bySymbol.get(symbol);
          return {
            ...item,
            symbol,
            companyName: snapshot?.companyName ?? symbol,
            logoUrl: snapshot?.logoUrl ?? null,
            riskScore: snapshot?.riskScore ?? null,
            riskLevel: snapshot?.riskLevel ?? null,
            volatilityScore: snapshot?.volatilityScore ?? null,
            price: quote?.price ?? null,
            change: quote?.change ?? null,
            changePercentage: quote?.changePercentage ?? null,
          };
        }),
      };
    });
  }
  async getIntelligence(value: string) {
    const symbol = this.symbol(value);
    const runId = await this.results.getActiveRun();
    return this.cache.get(`scorecard:${runId ?? 'none'}:${symbol}`, 60000, async () => {
      const scorecard = await this.prepared.getScorecard(symbol);
      if (!scorecard)
        throw new NotFoundException({
          code: 'INTELLIGENCE_NOT_PREPARED',
          message: 'Analysis is not yet available for this stock.',
        });
      return scorecard;
    });
  }
  async financials(value: string) {
    const symbol = this.symbol(value);
    const runId = await this.results.getActiveRun();
    return this.cache.get(`financials:${runId ?? 'none'}:${symbol}`, 60000, async () => {
      const analysis = await this.prepared.getAnalysis(symbol);
      if (!analysis)
        throw new NotFoundException({
          code: 'INTELLIGENCE_NOT_PREPARED',
          message: 'Analysis is not yet available for this stock.',
        });
      return analysis;
    });
  }
  earnings(value: string) {
    const symbol = this.symbol(value);
    return this.cache.get(`earnings:${symbol}`, 60000, async () => {
      const [statements, forecast] = await Promise.allSettled([
        this.http
          .get('income-statement', {symbol, period: 'quarter', limit: '12'})
          .then((rows) => parseStatements(rows, symbol)),
        this.http.get('analyst-estimates', {symbol, period: 'quarter', page: '0', limit: '100'}),
      ]);
      const reported = statements.status === 'fulfilled' ? statements.value : null;
      const estimates = parseEstimates(
        forecast.status === 'fulfilled' ? forecast.value : [],
        symbol,
        reported?.periodEnd ?? null,
        Date.now(),
      );
      if (!reported && !estimates.period) {
        throw new BadGatewayException('FMP earnings unavailable.');
      }
      const warnings: string[] = [];
      if (!reported) {
        warnings.push('Reported results unavailable.');
      }
      if (!estimates.period) {
        warnings.push('Quarterly analyst estimates unavailable.');
      } else {
        if (estimates.eps === null) {
          warnings.push('EPS estimates unavailable.');
        }
        if (estimates.revenue === null) {
          warnings.push('Revenue estimates unavailable.');
        }
      }
      return {earnings: {symbol, reported, estimates, warnings, fetchedAt: new Date().toISOString()}};
    });
  }
  chart(value: string, range: string) {
    const symbol = this.symbol(value);
    if (typeof range !== 'string' || !['1D', '1W', '1M', '3M', '1Y', '5Y'].includes(range)) {
      throw new BadRequestException('Invalid chart range.');
    }
    return this.cache.get(`chart:${symbol}:${range}`, range === '1D' ? 60000 : 300000, async () => {
      const from = new Date();
      if (range === '5Y') {
        from.setUTCFullYear(from.getUTCFullYear() - 5);
      } else {
        from.setUTCDate(from.getUTCDate() - ({'1D': 7, '1W': 8, '1M': 35, '3M': 100, '1Y': 370}[range] ?? 7));
      }
      const endpoint =
        range === '1D'
          ? 'historical-chart/5min'
          : range === '1W'
            ? 'historical-chart/1hour'
            : 'historical-price-eod/full';
      const [rows, quote] = await Promise.all([
        this.http.get<Row[]>(endpoint, {
          symbol,
          from: from.toISOString().slice(0, 10),
          to: new Date().toISOString().slice(0, 10),
        }),
        this.http.get<Row[]>('quote', {symbol}).catch(() => [] as Row[]),
      ]);
      if (!Array.isArray(rows)) {
        throw new BadGatewayException('Invalid chart response.');
      }
      let points = rows
        .flatMap((row) =>
          typeof row.date === 'string' && number(row.close) !== null
            ? [{date: row.date, price: number(row.close)!, volume: number(row.volume)}]
            : [],
        )
        .sort((a, b) => a.date.localeCompare(b.date));
      if (range === '1D' && points.length) {
        const day = points[points.length - 1].date.slice(0, 10);
        points = points.filter((point) => point.date.startsWith(day));
      }
      return {symbol, range, previousClose: number(quote[0]?.previousClose), points};
    });
  }
}
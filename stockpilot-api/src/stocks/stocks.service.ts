import {Injectable, NotFoundException} from '@nestjs/common';
import {FirebaseService} from '../firebase/firebase.service';
import {FmpQuoteService, type FmpQuote} from '../fmp/services/fmp-quote.service';
import {FmpRiskDataService} from '../fmp/services/fmp-risk-data.service';
import {PreparedStockRepository} from '../intelligence/repositories/prepared-stock.repository';
import {ScreenerResultsRepository} from '../intelligence/repositories/screener-results.repository';
import {FinanciallyStrongService} from '../intelligence/services/financially-strong.service';
type StockCatalogDocument = {
  symbol?: string;
  companyName?: string;
  logoUrl?: string | null;
  riskScore?: number | null;
  riskLevel?: 'low' | 'medium' | 'high' | null;
  volatilityScore?: number | null;
  featured?: boolean;
  [key: string]: unknown;
};
type StockCatalogItem = StockCatalogDocument & {id: string};
@Injectable()
export class StocksService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly prepared: PreparedStockRepository,
    private readonly quoteService: FmpQuoteService,
    private readonly riskDataService: FmpRiskDataService,
    private readonly financiallyStrongService: FinanciallyStrongService,
    private readonly screenerResultsRepository: ScreenerResultsRepository,
  ) {}
  async getCatalog() {
    const snapshot = await this.firebaseService.db.collection('stocks').get();
    const stocks: StockCatalogItem[] = snapshot.docs
      .map((doc): StockCatalogItem => {
        const data = doc.data() as StockCatalogDocument;
        return {id: doc.id, ...data};
      })
      .sort((first, second) => String(first.symbol ?? '').localeCompare(String(second.symbol ?? '')));
    return {stocks};
  }
  async getFeatured() {
    const snapshot = await this.firebaseService.db.collection('stocks').where('featured', '==', true).get();
    const symbols = snapshot.docs.map((doc) => doc.id.trim().toUpperCase()).filter(Boolean);
    if (!symbols.length) {
      return {stocks: []};
    }
    const quotes = await this.quoteService.getQuotes(symbols);
    const quoteMap = new Map<string, FmpQuote>(quotes.map((quote) => [quote.symbol.trim().toUpperCase(), quote]));
    const stocks = await Promise.all(
      symbols.map(async (symbol) => {
        const quote = quoteMap.get(symbol);
        try {
          const risk = await this.riskDataService.getStockRiskMetrics(symbol);
          return {
            symbol,
            companyName: risk.companyName ?? symbol,
            logoUrl: risk.logoUrl ?? null,
            price: quote?.price ?? null,
            change: quote?.change ?? null,
            changePercentage: quote?.changePercentage ?? null,
            riskScore: risk.riskScore ?? null,
            riskLevel: risk.riskLevel ?? null,
            volatilityScore: risk.volatilityScore ?? null,
          };
        } catch {
          return {
            symbol,
            companyName: symbol,
            logoUrl: null,
            price: quote?.price ?? null,
            change: quote?.change ?? null,
            changePercentage: quote?.changePercentage ?? null,
            riskScore: null,
            riskLevel: null,
            volatilityScore: null,
          };
        }
      }),
    );
    return {stocks};
  }
  async getFinanciallyStrong(page = 0, limit = 5) {
    return this.financiallyStrongService.getFinanciallyStrong(page, limit);
  }
  async getMarketStocks(screenerId: string, page = 0, limit = 15) {
    /*
     * Which stocks belong to the screener
     * comes entirely from the active weekly
     * Firestore run.
     */
    const screener = await this.screenerResultsRepository.getResults(screenerId, page, limit);
    if (screener.items.length === 0) {
      return {...screener, items: []};
    }
    const symbols = screener.items.map((item) => item.symbol.trim().toUpperCase());
    /*
     * Read precomputed risk / volatility /
     * company metadata from Firestore.
     */
    const snapshotMap = await this.screenerResultsRepository.getStockSnapshots(symbols, screener.runId);
    /*
     * Current market quote is the only FMP
     * request required by this endpoint.
     */
    const quotes = await this.quoteService.getQuotes(symbols);
    const quoteMap = new Map<string, FmpQuote>(quotes.map((quote) => [quote.symbol.trim().toUpperCase(), quote]));
    /*
     * Merge everything by ticker.
     */
    const items = screener.items.map((result) => {
      const symbol = result.symbol.trim().toUpperCase();
      const snapshot = snapshotMap.get(symbol);
      const quote = quoteMap.get(symbol);
      return {
        symbol,
        companyName: snapshot?.companyName ?? symbol,
        logoUrl: snapshot?.logoUrl ?? null,
        price: quote?.price ?? null,
        change: quote?.change ?? null,
        changePercentage: quote?.changePercentage ?? null,
        riskScore: snapshot?.riskScore ?? null,
        riskLevel: snapshot?.riskLevel ?? null,
        volatilityScore: snapshot?.volatilityScore ?? null,
        score: result.score,
        coverage: result.coverage,
        rank: result.rank,
      };
    });
    return {...screener, items};
  }
  async getIntelligence(symbol: string) {
    const scorecard = await this.prepared.getScorecard(symbol);
    if (!scorecard)
      throw new NotFoundException({
        code: 'INTELLIGENCE_NOT_PREPARED',
        message: 'Analysis is not yet available for this stock.',
      });
    return scorecard;
  }
  async getQuotes(symbols: string[]) {
    const normalized = symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean);
    if (!normalized.length) {
      return {quotes: []};
    }
    const quotes = await this.quoteService.getQuotes(normalized);
    return {quotes};
  }
  async getQuote(symbol: string) {
    return this.quoteService.getQuote(symbol.trim().toUpperCase());
  }
  async getRisk(symbol: string) {
    const stored = await this.prepared.getPrepared(symbol, 'intelligence');
    if (!stored?.risk)
      throw new NotFoundException({
        code: 'INTELLIGENCE_NOT_PREPARED',
        message: 'Risk analysis is not yet available for this stock.',
      });
    return {...stored.risk, sourceRunId: stored.sourceRunId, stale: stored.stale};
  }
}

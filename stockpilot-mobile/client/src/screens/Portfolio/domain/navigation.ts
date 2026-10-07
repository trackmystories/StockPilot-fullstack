import type { StockFilterRoutes } from '../../StockFilter/domain/stockFilter';
import type { SelectStock } from '../../StockPilot/types/stockPilot';
import type { ScoreCardItem } from '../../StockPilotScoreCard/components/ScoreCardsSection';
import type { PortfolioInstrument } from './portfolio';
import type { InvestmentDraft } from './investments';

export type PortfolioStackParamList = StockFilterRoutes & {
  PortfoliosHome: { draft?: InvestmentDraft; creating?: boolean; } | undefined;
  PortfolioDetail: { portfolioId: string; };
  PortfolioTransaction: { draft: InvestmentDraft; portfolioId?: string; returnToPortfolio?: boolean; };
  PortfolioSale: { portfolioId: string; instrumentId: string; };
  PortfolioRemoveEntry: { portfolioId: string; instrument: PortfolioInstrument; };
  PortfolioSettings: { portfolioId: string; };
  StockSearch: undefined;
  Notifications: undefined;
  StockPilotScoreCard: { stock: SelectStock; };
  Tape: { symbol: string; };
  AllScoreCards: { symbol: string; companyName?: string | null; scores: ScoreCardItem[]; };
  News: undefined;
  NewsArticle: { articleId: string; };
};

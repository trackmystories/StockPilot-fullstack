import type {HomeStackParamList} from '../../../';
import type {useFmpCompanyProfile} from '../../stocks/useFmpCompanyProfile';
import type {useFmpQuote} from '../../stocks/useFmpQuote';
import type {useStockIntelligence} from '../../stocks/useStockIntelligence';
import type {ScoreCardItem} from '../components/ScoreCardsSection';

type Stock = HomeStackParamList['StockPilotScoreCard']['stock'];
type Quote = ReturnType<typeof useFmpQuote>['quote'];
type CompanyProfile = ReturnType<typeof useFmpCompanyProfile>['profile'];
type Intelligence = ReturnType<typeof useStockIntelligence>['data'];
type BuildHeaderStockParams = {
  stock: Stock;
  quote: Quote;
  companyProfile: CompanyProfile;
  epsDilutedTtm: number | null;
};
type BuildScoreCardsParams = {stock: Stock; intelligence: Intelligence};
export function buildHeaderStock({
  stock,
  quote,
  companyProfile,
  epsDilutedTtm,
}: BuildHeaderStockParams) {
  const peRatio =
    quote?.price && epsDilutedTtm && epsDilutedTtm > 0 ? quote.price / epsDilutedTtm : null;
  return {
    ...stock,
    companyName: companyProfile?.companyName ?? stock.name,
    logoUrl: companyProfile?.image ?? stock.logoUrl ?? null,
    exchange: quote?.exchange ?? stock.exchange ?? null,
    price: quote?.price ?? null,
    change: quote?.change ?? null,
    changePercentage: quote?.changePercentage ?? null,
    open: quote?.open ?? null,
    dayHigh: quote?.dayHigh ?? null,
    dayLow: quote?.dayLow ?? null,
    volume: quote?.volume ?? null,
    asOf: quote?.asOf ?? null,
    marketCap: quote?.marketCap ?? null,
    epsDilutedTtm,
    peRatio,
  };
}
const scoreIds = [
  'overall',
  'risk',
  'volatility',
  'quality',
  'growth',
  'financialHealth',
  'conviction',
  'valuation',
  'momentum',
  'earningsQuality',
  'capitalEfficiency',
  'reratingPotential',
  'execution',
  'cashPower',
  'fundingPressure',
  'dilutionRisk',
  'balanceSheetResilience',
  'growthDurability',
  'marginPower',
  'capitalDiscipline',
  'earningsReliability',
  'businessEfficiency',
  'valuationCompressionRisk',
  'recovery',
  'breakoutReadiness',
  'fundamentalMomentum',
  'survival',
  'shareholderFriendliness',
  'selfFunding',
  'operatingLeverage',
  'dilution',
] as const;
const riskIds = new Set<string>([
  'risk',
  'volatility',
  'fundingPressure',
  'dilutionRisk',
  'valuationCompressionRisk',
]);
export function buildScoreCards({intelligence}: BuildScoreCardsParams): ScoreCardItem[] {
  return scoreIds.map((id) => {
    const result = intelligence?.scores?.[id];
    return {
      id,
      score:
        result?.eligible !== false &&
        (result?.coverage ?? 0) >= 0.5 &&
        typeof result?.score === 'number' &&
        Number.isFinite(result.score)
          ? result.score
          : null,
      direction: result?.direction ?? (riskIds.has(id) ? 'higher_is_riskier' : 'higher_is_better'),
      coverage: result?.coverage,
      confidence: result?.confidence,
      eligible: result?.eligible,
      reasons: result?.reasons,
    };
  });
}

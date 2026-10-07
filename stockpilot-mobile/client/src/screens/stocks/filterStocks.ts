import type {SelectStock} from '../screens/StockPilotSelect/types/stockPilotSelect';

type Filters = Partial<{
  marketCap: string;
  sector: string;
  revenueGrowth: number;
  profitability: string;
  debt: string;
  analystUpside: number;
  momentum: string;
  fromATH: string;
  fromATL: string;
  risk: string;
}>;

const active = (value?: string): boolean => Boolean(value && value !== 'Any');

const atLeast = (value: number | null, minimum?: number): boolean => {
  return !minimum || (value !== null && value >= minimum);
};

export function filterStocks(stocks: SelectStock[], filters: Filters): SelectStock[] {
  return stocks.filter((stock) => {
    if (active(filters.marketCap) && stock.marketCap !== filters.marketCap) {
      return false;
    }

    if (
      active(filters.sector) &&
      stock.sector !== filters.sector &&
      stock.themeName !== filters.sector
    ) {
      return false;
    }

    if (!atLeast(stock.revenueGrowth, filters.revenueGrowth)) {
      return false;
    }

    if (!atLeast(stock.analystUpside, filters.analystUpside)) {
      return false;
    }

    const profitability =
      filters.profitability === 'Pre-profit' ? 'Unprofitable' : filters.profitability;

    if (active(profitability) && stock.profitability !== profitability) {
      return false;
    }

    const debt =
      filters.debt === 'Moderate'
        ? 'Moderate Debt'
        : filters.debt === 'High'
          ? 'High Debt'
          : filters.debt;

    if (active(debt) && stock.debt !== debt) {
      return false;
    }

    if (active(filters.momentum) && stock.momentum !== filters.momentum) {
      return false;
    }

    if (active(filters.risk) && stock.riskLevel !== filters.risk?.toLowerCase()) {
      return false;
    }

    if (active(filters.fromATH)) {
      const value = stock.percentFromATH;

      if (value === null) return false;

      if (filters.fromATH === 'Within 10%' && value > 10) {
        return false;
      }

      if (filters.fromATH === '10–30%' && (value <= 10 || value > 30)) {
        return false;
      }

      if (filters.fromATH === '30%+' && value <= 30) {
        return false;
      }
    }

    if (active(filters.fromATL)) {
      const value = stock.percentFromATL;

      if (value === null) return false;

      if (filters.fromATL === 'Near ATL' && value > 20) {
        return false;
      }

      if (filters.fromATL === 'Rebounding' && (value <= 20 || value >= 100)) {
        return false;
      }

      if (filters.fromATL === 'Extended' && value < 100) {
        return false;
      }
    }

    return true;
  });
}

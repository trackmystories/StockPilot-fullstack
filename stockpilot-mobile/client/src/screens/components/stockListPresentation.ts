// Presentation-only values. Screens adapt their own data; this list never fetches stocks.
export type StockListItem = {
  symbol: string;
  companyName: string;
  logoUrl?: string | null;
  price: number | null;
  currency: string | null;
  marketCap: number | null;
  momentumScore: number | null;
  stale?: boolean;
};
export type StockListLayout = {
  stacked: boolean;
  verticalMetrics: boolean;
  padding: number;
  gap: number;
  actionsWidth: number;
  companyWidth: number;
  priceWidth: number;
  marketCapWidth: number;
  momentumWidth: number;
  logoSize: number;
  symbolFontSize: number;
  labelFontSize: number;
  valueFontSize: number;
  detailFontSize: number;
  maxFontSizeMultiplier: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function getStockListLayout(width: number, fontScale = 1, withPortfolioAction = false): StockListLayout {
  const availableWidth = isFiniteNumber(width) && width > 0 ? width : 390;
  const textScale = isFiniteNumber(fontScale) && fontScale > 0 ? fontScale : 1;
  const scale = clamp(availableWidth / 390, 0.82, 1.1);
  const padding = availableWidth < 360 ? 10 : availableWidth < 600 ? 12 : 20;
  const gap = availableWidth < 360 ? 6 : availableWidth < 600 ? 8 : 12;
  const actionsWidth = withPortfolioAction ? 104 : 60;
  // Budget all four columns together so the company retains space on small phones.
  const dataWidth = Math.max(0, availableWidth - padding * 2 - gap * 4 - actionsWidth);
  const priceWidth = Math.min(94, Math.round(dataWidth * 0.21));
  const marketCapWidth = Math.min(92, Math.round(dataWidth * 0.21));
  const momentumWidth = Math.min(96, Math.round(dataWidth * 0.22));
  return {
    // Retain the existing layout contract, but never switch list rows into cards.
    stacked: false,
    verticalMetrics: false,
    padding,
    gap,
    actionsWidth,
    companyWidth: Math.max(0, dataWidth - priceWidth - marketCapWidth - momentumWidth),
    priceWidth,
    marketCapWidth,
    momentumWidth,
    logoSize: availableWidth < 360 ? 24 : availableWidth < 430 ? 28 : 31,
    symbolFontSize: clamp(15 * scale, 12, 16),
    labelFontSize: clamp(11 * scale, 9.5, 12),
    valueFontSize: clamp(14 * scale, 12, 15.5),
    detailFontSize: clamp(10.5 * scale, 9, 11.5),
    // Bound scaling only inside this dense table; do not change app-wide text settings.
    maxFontSizeMultiplier: clamp(textScale, 1, 1.15),
  };
}

export function formatPrice(value: number | null | undefined): string {
  if (!isFiniteNumber(value) || value < 0) {
    return '—';
  }
  // Do not display a positive sub-cent quote as 0.00.
  if (value > 0 && value < 0.000001) {
    return value.toExponential(2);
  }
  const decimals = value > 0 && value < 1
    ? Math.min(8, Math.max(4, -Math.floor(Math.log10(value)) + 2))
    : 2;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

export function formatMarketCap(value: number | null | undefined): string {
  if (!isFiniteNumber(value) || value <= 0) {
    return '—';
  }
  const units = [
    { divisor: 1, suffix: '' },
    { divisor: 1e3, suffix: 'K' },
    { divisor: 1e6, suffix: 'M' },
    { divisor: 1e9, suffix: 'B' },
    { divisor: 1e12, suffix: 'T' },
    { divisor: 1e15, suffix: 'Q' },
  ];
  let index = 0;
  while (index < units.length - 1 && value >= units[index + 1].divisor) {
    index += 1;
  }
  // Rounding must promote 999.999M to 1B, not render 1,000M.
  if (index < units.length - 1 && Number((value / units[index].divisor).toFixed(2)) >= 1000) {
    index += 1;
  }
  const unit = units[index];
  return `${(value / unit.divisor).toLocaleString('en-US', { maximumFractionDigits: 2 })}${unit.suffix}`;
}

export function getMomentumScore(value: number | null | undefined): number | null {
  return isFiniteNumber(value) && value >= 0 && value <= 10 ? value : null;
}

export function getMomentumColor(momentum: number | null): string {
  if (momentum === null) {
    return '#7788A3';
  }
  return momentum >= 7 ? '#079B73' : momentum >= 4 ? '#C58A22' : '#D9534F';
}

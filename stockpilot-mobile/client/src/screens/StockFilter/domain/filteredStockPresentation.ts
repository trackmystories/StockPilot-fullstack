import type {FilterStock} from './stockFilter';
export type FilteredStockLayout = {
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
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function getFilteredStockLayout(width: number, fontScale = 1): FilteredStockLayout {
  const availableWidth = isFiniteNumber(width) && width > 0 ? width : 390;
  const textScale = isFiniteNumber(fontScale) && fontScale > 0 ? fontScale : 1;
  const scale = clamp(availableWidth / 390, 0.9, 1.1);
  const padding = availableWidth < 360 ? 12 : 16;
  const gap = availableWidth < 400 ? 6 : 8;
  const actionsWidth = 60;
  const priceWidth = Math.round(clamp(availableWidth * 0.15, 54, 94));
  const marketCapWidth = Math.round(clamp(availableWidth * 0.14, 50, 92));
  const momentumWidth = Math.round(clamp(availableWidth * 0.17, 62, 96));
  return {
    // Keep readable type instead of squeezing five columns into a narrow viewport.
    stacked: availableWidth < 360 || textScale > 1.2,
    verticalMetrics: textScale > 1.8,
    padding,
    gap,
    actionsWidth,
    companyWidth: Math.max(
      0,
      availableWidth - padding * 2 - gap * 4 - actionsWidth - priceWidth - marketCapWidth - momentumWidth,
    ),
    priceWidth,
    marketCapWidth,
    momentumWidth,
    logoSize: availableWidth < 400 ? 28 : 31,
    symbolFontSize: clamp(15 * scale, 13, 17),
    labelFontSize: clamp(11 * scale, 10, 12),
    valueFontSize: clamp(14 * scale, 12, 16),
    detailFontSize: clamp(11 * scale, 10, 12),
  };
}

export function formatSavedPrice(value: number | null | undefined): string {
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
    {divisor: 1, suffix: ''},
    {divisor: 1e3, suffix: 'K'},
    {divisor: 1e6, suffix: 'M'},
    {divisor: 1e9, suffix: 'B'},
    {divisor: 1e12, suffix: 'T'},
    {divisor: 1e15, suffix: 'Q'},
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
  return `${(value / unit.divisor).toLocaleString('en-US', {maximumFractionDigits: 2})}${unit.suffix}`;
}

export function getSavedMomentum(stock: Pick<FilterStock, 'scores'>): number | null {
  const value = stock.scores?.momentum;
  return isFiniteNumber(value) && value >= 0 && value <= 10 ? value : null;
}

export function getMomentumColor(momentum: number | null): string {
  if (momentum === null) {
    return '#7788A3';
  }
  return momentum >= 7 ? '#079B73' : momentum >= 4 ? '#C58A22' : '#D9534F';
}
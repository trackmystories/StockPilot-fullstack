export type MarketIndicator = {
  id: string;
  label: string;
  valueUnit: 'points' | 'percent';
  changeUnit: 'percent' | 'basis_points';
  colorMode: 'directional' | 'neutral';
  value: number | null;
  change: number | null;
  asOf: string | null;
  previousAsOf: string | null;
  asOfPrecision: 'timestamp' | 'date';
  status: 'available' | 'unavailable';
};

const numberFormat = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function validDate(value: unknown): string | null {
  return typeof value === 'string' && Number.isFinite(Date.parse(value)) ? value : null;
}

export function parseMarketIndicators(response: unknown): MarketIndicator[] {
  if (
    !response ||
    typeof response !== 'object' ||
    !('items' in response) ||
    !Array.isArray(response.items)
  ) {
    throw new Error('Invalid market indicators response.');
  }

  const seen = new Set<string>();

  return response.items.map((item: unknown) => {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid market indicator.');
    }

    const row = item as Record<string, unknown>;

    if (
      typeof row.id !== 'string' ||
      !row.id ||
      seen.has(row.id) ||
      typeof row.label !== 'string' ||
      !row.label ||
      (row.valueUnit !== 'points' && row.valueUnit !== 'percent') ||
      (row.changeUnit !== 'percent' && row.changeUnit !== 'basis_points') ||
      (row.colorMode !== 'directional' && row.colorMode !== 'neutral') ||
      (row.asOfPrecision !== 'timestamp' && row.asOfPrecision !== 'date') ||
      (row.status !== 'available' && row.status !== 'unavailable')
    ) {
      throw new Error('Invalid market indicator metadata.');
    }

    seen.add(row.id);

    const available = row.status === 'available' && isNumber(row.value);

    return {
      id: row.id,
      label: row.label,
      valueUnit: row.valueUnit,
      changeUnit: row.changeUnit,
      colorMode: row.colorMode,
      value: available ? (row.value as number) : null,
      change: available && isNumber(row.change) ? row.change : null,
      asOf: validDate(row.asOf),
      previousAsOf: validDate(row.previousAsOf),
      asOfPrecision: row.asOfPrecision,
      status: available ? 'available' : 'unavailable',
    };
  });
}

export function presentMarketIndicator(item: MarketIndicator) {
  const valueSuffix = item.valueUnit === 'percent' ? '%' : '';
  const value = item.value === null ? '—' : `${numberFormat.format(item.value)}${valueSuffix}`;
  const change = item.change;
  const changeArrow = change === null ? '' : change > 0 ? '▲ ' : change < 0 ? '▼ ' : '';
  const changeUnit = item.changeUnit === 'basis_points' ? ' bp' : '%';
  const changeText =
    change === null ? '—' : `${changeArrow}${Math.abs(change).toFixed(2)}${changeUnit}`;
  const color = change === null || change === 0 ? '#71819B' : change > 0 ? '#079B6D' : '#E34848';
  const date = item.asOf ? new Date(item.asOf) : null;

  let sourceTime = 'Source time unavailable';

  if (item.status === 'unavailable') {
    sourceTime = 'Unavailable';
  } else if (date) {
    if (item.asOfPrecision === 'date') {
      sourceTime = `As of ${item.asOf?.slice(0, 10)} · daily`;
    } else {
      const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      const formattedTime = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });

      sourceTime = `As of ${formattedDate} ${formattedTime}`;
    }
  }

  const changeDirection =
    change === null ? '' : change > 0 ? 'up' : change < 0 ? 'down' : 'unchanged';
  const accessibleUnit = item.changeUnit === 'basis_points' ? 'basis points' : 'percent';
  const accessibleChange =
    change === null
      ? 'change unavailable'
      : `${changeDirection} ${Math.abs(change).toFixed(2)} ${accessibleUnit}`;
  const comparison = item.previousAsOf ? `, compared with ${item.previousAsOf}` : '';
  const accessibilityLabel = `${item.label}, ${value}, ${accessibleChange}, ${sourceTime}${comparison}`;

  return {
    value,
    changeText,
    color,
    sourceTime,
    accessibilityLabel,
  };
}

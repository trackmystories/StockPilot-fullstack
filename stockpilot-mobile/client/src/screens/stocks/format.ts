export const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const numberText = (value: number | null | undefined, digits = 1): string => {
  return isNumber(value) ? value.toFixed(digits) : 'N/A';
};

export const moneyText = (
  value: number | null | undefined,
  currency = 'USD',
  digits = 2,
): string => {
  return isNumber(value) ? `${currency} ${value.toFixed(digits)}` : 'N/A';
};

export const percentText = (value: number | null | undefined, digits = 2): string => {
  return isNumber(value) ? `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%` : 'N/A';
};

export function compactMoney(
  value: number | null | undefined,
  currency: string | null = 'USD',
): string {
  if (!isNumber(value)) {
    return 'N/A';
  }

  const abs = Math.abs(value);

  const [divisor, suffix] =
    abs >= 1e12
      ? [1e12, 'T']
      : abs >= 1e9
        ? [1e9, 'B']
        : abs >= 1e6
          ? [1e6, 'M']
          : abs >= 1e3
            ? [1e3, 'K']
            : [1, ''];

  return `${currency ? currency + ' ' : ''}${(value / Number(divisor)).toFixed(2)}${suffix}`;
}

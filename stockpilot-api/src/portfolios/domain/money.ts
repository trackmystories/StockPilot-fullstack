// All ledger arithmetic uses eight-decimal fixed point, never binary floating-point.
// Values cross Firestore/HTTP as decimal strings. Rounding is half away from zero.
export const SCALE = 100_000_000n;
export const ZERO = 0n;

export function read(value: unknown): bigint {
  if (typeof value !== 'string' || value.length > 50 || !/^-?\d+(?:\.\d{1,8})?$/.test(value)) {
    throw new Error('Use a decimal number with no more than eight decimal places.');
  }
  const negative = value.startsWith('-');
  const [whole, fraction = ''] = (negative ? value.slice(1) : value).split('.');
  const units = BigInt(whole) * SCALE + BigInt(fraction.padEnd(8, '0'));
  return negative ? -units : units;
}

export function print(value: bigint): string {
  const absolute = value < 0n ? -value : value;
  const fraction = (absolute % SCALE).toString().padStart(8, '0').replace(/0+$/, '');
  return `${value < 0n ? '-' : ''}${absolute / SCALE}${fraction ? `.${fraction}` : ''}`;
}

export function roundDivide(numerator: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new Error('Cannot divide by zero.');
  const negative = (numerator < 0n) !== (denominator < 0n);
  const a = numerator < 0n ? -numerator : numerator;
  const b = denominator < 0n ? -denominator : denominator;
  const rounded = a / b + (2n * (a % b) >= b ? 1n : 0n);
  return negative ? -rounded : rounded;
}

export const multiply = (a: bigint, b: bigint): bigint => roundDivide(a * b, SCALE);
export const percent = (part: bigint, whole: bigint): number | null =>
  whole > 0n ? Number(roundDivide(part * 10_000n, whole)) / 100 : null;
export const sum = (values: string[]): bigint => values.reduce((total, value) => total + read(value), 0n);
export const sumKnown = (values: (string | null)[]): string | null =>
  values.some((value) => value === null) ? null : print(sum(values as string[]));

export function fromMarketNumber(value: number | null | undefined): bigint | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1e15) return null;
  const amount = read(value.toFixed(8));
  return value > 0 && amount === 0n ? null : amount;
}

export const CALCULATION_VERSION = 4;
export const READABLE_CALCULATION_VERSIONS = [2, 3, 4] as const;
export const PREPARED_MAX_AGE_MS = 8 * 24 * 60 * 60 * 1000;

export function isReadableCalculationVersion(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    READABLE_CALCULATION_VERSIONS.includes(value as (typeof READABLE_CALCULATION_VERSIONS)[number])
  );
}
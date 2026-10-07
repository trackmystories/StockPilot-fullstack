export function money(value: string | null | undefined, currency: string, compact = false): string {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
    ...(compact ? { notation: 'compact' } : {})
  }).format(Number(value));
}
export function percent(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : `${value.toFixed(1)}%`;
}
export const gainColor = (value: string | number | null | undefined): string => value == null ? '#7788A3' : Number(value) < 0 ? '#D9534F' : '#079B73';
export const dateLabel = (date: string | null | undefined): string => {
  if (!date || !Number.isFinite(Date.parse(date))) return 'Date unavailable';
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  });
};
export const today = () => new Date().toISOString().slice(0, 10);
export function newRequestId(): string {
  // Uniqueness token only; authentication and authorization always stay on the server.
  return `portfolio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

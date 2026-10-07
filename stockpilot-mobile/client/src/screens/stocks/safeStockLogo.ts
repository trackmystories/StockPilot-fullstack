// Also protects old watchlist/portfolio/search records saved before the provider switch.
export function safeStockLogo(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  const match = /^https:\/\/([a-z0-9.-]+)(?::\d+)?(?:[/?#]|$)/i.exec(url);
  if (!match) return null;
  const host = match[1].toLowerCase().replace(/\.$/, '');
  if (['financialmodelingprep.com', 'fmpcloud.io'].some((domain) => host === domain || host.endsWith(`.${domain}`))) return null;
  return url;
}

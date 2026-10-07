export function stripLegacyAssets(value: unknown): unknown {
  if (typeof value === 'string') {
    const match = /^https?:\/\/([^/?#]+)/i.exec(value.trim());
    const host = match?.[1].split('@').pop()?.split(':')[0].toLowerCase().replace(/\.$/, '');
    if (host && ['financialmodelingprep.com', 'fmpcloud.io'].some((domain) => host === domain || host.endsWith(`.${domain}`))) return null;
    return value;
  }
  if (Array.isArray(value)) return value.map(stripLegacyAssets);
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(Object.entries(value).map(([key,item]) => [key,stripLegacyAssets(item)]));
  }
  return value;
}

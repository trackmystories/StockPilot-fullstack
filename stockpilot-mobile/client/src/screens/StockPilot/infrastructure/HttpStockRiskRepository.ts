export type StockRiskDetails = {
  symbol: string;

  companyName: string | null;

  logoUrl: string | null;

  riskScore: number | null;

  riskLevel: 'low' | 'medium' | 'high' | null;

  volatilityScore: number | null;
};

export class HttpStockRiskRepository {
  async getRisk(token: string, symbol: string): Promise<StockRiskDetails> {
    const API_URL = process.env.EXPO_PUBLIC_API_URL;

    if (!API_URL) {
      throw new Error('EXPO_PUBLIC_API_URL is missing.');
    }

    const normalizedSymbol = symbol.trim().toUpperCase();

    const response = await fetch(
      `${API_URL}/api/stocks/${encodeURIComponent(normalizedSymbol)}/risk`,
      {
        method: 'GET',

        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.message ?? `Could not load risk data for ${normalizedSymbol}.`);
    }

    return {
      symbol: normalizedSymbol,

      companyName: typeof data.companyName === 'string' ? data.companyName : null,

      logoUrl: typeof data.logoUrl === 'string' ? data.logoUrl : null,

      riskScore: typeof data.riskScore === 'number' ? data.riskScore : null,

      riskLevel:
        data.riskLevel === 'low' || data.riskLevel === 'medium' || data.riskLevel === 'high'
          ? data.riskLevel
          : null,

      volatilityScore: typeof data.volatilityScore === 'number' ? data.volatilityScore : null,
    };
  }
}

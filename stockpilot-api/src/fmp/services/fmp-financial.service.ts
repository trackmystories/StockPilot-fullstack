import {Injectable} from '@nestjs/common';
import {FmpHttpService} from '../clients/fmp-http.service';

export type FmpFinancialStatements = {
  symbol: string;
  income: Record<string, unknown>[];
  balanceSheet: Record<string, unknown>[];
  cashFlow: Record<string, unknown>[];
};

@Injectable()
export class FmpFinancialService {
  constructor(private readonly http: FmpHttpService) {}

  async getFinancialStatements(rawSymbol: string): Promise<FmpFinancialStatements> {
    const symbol = this.validateSymbol(rawSymbol);

    const income = await this.fetchStatement('income-statement', symbol);

    const balanceSheet = await this.fetchStatement('balance-sheet-statement', symbol);

    const cashFlow = await this.fetchStatement('cash-flow-statement', symbol);

    return {
      symbol,
      income,
      balanceSheet,
      cashFlow,
    };
  }

  private async fetchStatement(endpoint: string, symbol: string): Promise<Record<string, unknown>[]> {
    const payload = await this.http.get<unknown>(endpoint, {
      symbol,
      period: 'quarter',
      limit: '16',
    });

    if (!Array.isArray(payload)) {
      throw new Error(`Invalid ${endpoint} response for ${symbol}.`);
    }

    return payload as Record<string, unknown>[];
  }

  private validateSymbol(rawSymbol: string): string {
    const symbol = rawSymbol.trim().toUpperCase();

    if (!/^[A-Z0-9][A-Z0-9.^-]{0,19}$/.test(symbol)) {
      throw new Error('Invalid stock symbol.');
    }

    return symbol;
  }
}

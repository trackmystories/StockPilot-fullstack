import {Injectable} from '@nestjs/common';
import {FieldValue} from 'firebase-admin/firestore';
import {FirebaseService} from '../../firebase/firebase.service';
import type {StockIntelligence} from '../types';
import {PreparedStockRepository} from './prepared-stock.repository';
@Injectable()
export class StockScorecardRepository {
  constructor(private readonly firebase: FirebaseService) {}
  async get(rawSymbol: string): Promise<StockIntelligence | null> {
    return new PreparedStockRepository(this.firebase).getScorecard(rawSymbol);
  }
  async save(rawSymbol: string, scorecard: StockIntelligence): Promise<void> {
    const symbol = this.normalizeSymbol(rawSymbol);
    const calculatedAt = Date.now();
    await this.firebase.db
      .collection('stockScorecards')
      .doc(symbol)
      .set(
        {symbol, schemaVersion: 2, calculatedAt, data: scorecard, updatedAt: FieldValue.serverTimestamp()},
        {merge: true},
      );
  }
  async delete(rawSymbol: string): Promise<void> {
    const symbol = this.normalizeSymbol(rawSymbol);
    await this.firebase.db.collection('stockScorecards').doc(symbol).delete();
  }
  private normalizeSymbol(rawSymbol: string): string {
    return rawSymbol.trim().toUpperCase();
  }
}

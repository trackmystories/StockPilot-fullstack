import {BadRequestException, Injectable} from '@nestjs/common';
import {FieldValue} from 'firebase-admin/firestore';
import {FirebaseService} from '../firebase/firebase.service';

@Injectable()
export class WatchlistService {
  constructor(private readonly firebase: FirebaseService) {}

  private collection(uid: string) {
    return this.firebase.db.collection('users').doc(uid).collection('watchlist');
  }

  private ticker(value: unknown): string {
    const ticker = typeof value === 'string' ? value.trim().toUpperCase() : '';

    if (!/^[A-Z0-9][A-Z0-9.^-]{0,19}$/.test(ticker)) {
      throw new BadRequestException('Invalid ticker.');
    }

    return ticker;
  }

  async list(uid: string) {
    const page = await this.collection(uid).select('ticker').get();

    return {
      tickers: [...new Set(page.docs.map((doc) => this.ticker(doc.get('ticker') ?? doc.id)))].sort(),
    };
  }

  async add(uid: string, value: unknown) {
    const ticker = this.ticker(value);

    await this.collection(uid).doc(ticker).set(
      {
        ticker,
        updatedAt: FieldValue.serverTimestamp(),
      },
      {merge: true},
    );

    return {ticker};
  }

  async remove(uid: string, value: unknown) {
    const ticker = this.ticker(value);

    await this.collection(uid).doc(ticker).delete();

    return {ticker};
  }
}

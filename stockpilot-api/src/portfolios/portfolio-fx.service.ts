import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { get } from 'node:https';
import { FirebaseService } from '../firebase/firebase.service';
import { parseEcbDaily, validateFxQuote } from './domain/fx';
import type { FxQuote } from './portfolio.types';

const ECB_DAILY_URL = 'https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
const RECHECK_MS = 60 * 60 * 1000;
const RETRY_MS = 5 * 60 * 1000;

@Injectable()
export class PortfolioFxService {
  private readonly logger = new Logger(PortfolioFxService.name);
  private cached: FxQuote | null = null;
  private nextCheck = 0;
  private inFlight: Promise<FxQuote | null> | null = null;

  constructor(private readonly firebase: FirebaseService) {}

  // Shared across users and portfolios. A cold/stale cache may fetch one reference quote.
  async snapshot(): Promise<FxQuote | null> {
    const now = Date.now();
    if (now < this.nextCheck) return validateFxQuote(this.cached, now);
    if (!this.inFlight) {
      this.inFlight = this.load().finally(() => { this.inFlight = null; });
    }
    return this.inFlight;
  }

  @Cron('0 20 16 * * 1-5', {timeZone: 'UTC'})
  async scheduledRefresh(): Promise<void> {
    this.nextCheck = 0;
    await this.snapshot();
  }

  private async load(): Promise<FxQuote | null> {
    const ref = this.firebase.db.collection('portfolioFxRates').doc('EURUSD');
    const now = Date.now();
    try {
      const saved = validateFxQuote((await ref.get()).data(), now);
      if (saved && (!this.cached || saved.asOf >= this.cached.asOf)) this.cached = saved;
      if (saved && now - Date.parse(saved.fetchedAt) < RECHECK_MS) {
        this.nextCheck = Date.parse(saved.fetchedAt) + RECHECK_MS;
        return saved;
      }
      const quote = parseEcbDaily(await this.download());
      // A delayed provider response must never replace a newer cached reference date.
      if (!this.cached || quote.asOf >= this.cached.asOf) this.cached = quote;
      await ref.set(this.cached!);
      this.nextCheck = Date.now() + RECHECK_MS;
    } catch (error) {
      this.nextCheck = Date.now() + RETRY_MS;
      this.logger.warn(`Portfolio FX refresh unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    // Never substitute 1:1. An older acceptable quote is marked stale; expired quotes are null.
    return validateFxQuote(this.cached, Date.now());
  }

  private download(): Promise<string> {
    return new Promise((resolve, reject) => {
      const request = get(ECB_DAILY_URL, {headers: {Accept: 'application/xml,text/xml'}}, (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`ECB returned HTTP ${response.statusCode ?? 'unknown'}.`));
          return;
        }
        const chunks: Buffer[] = [];
        let length = 0;
        response.on('data', (chunk: Buffer) => {
          length += chunk.length;
          if (length > 100_000) {
            response.destroy(new Error('ECB response is too large.'));
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
        response.on('error', reject);
      });
      const deadline = setTimeout(() => request.destroy(new Error('ECB request timed out.')), 8000);
      request.on('close', () => clearTimeout(deadline));
      request.setTimeout(8000, () => request.destroy(new Error('ECB request timed out.')));
      request.on('error', reject);
    });
  }
}

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { FieldPath, type QueryDocumentSnapshot, type QuerySnapshot } from 'firebase-admin/firestore';
import { randomUUID } from 'node:crypto';
import { FirebaseService } from '../firebase/firebase.service';
import { PortfolioService } from './portfolio.service';

@Injectable()
export class PortfolioSnapshotsJob {
  private readonly logger = new Logger(PortfolioSnapshotsJob.name);
  private readonly owner = randomUUID();
  constructor(private readonly firebase: FirebaseService, private readonly config: ConfigService, private readonly portfolios: PortfolioService) { }

  private async claim(renew = false): Promise<boolean> {
    const ref = this.firebase.db.collection('portfolioJobs').doc('daily-observations');
    return this.firebase.db.runTransaction(async (tx) => {
      const lease = (await tx.get(ref)).data();
      if (renew && lease?.owner !== this.owner) return false;
      if (!renew && typeof lease?.until === 'number' && lease.until > Date.now()) return false;
      tx.set(ref, {
        owner: this.owner,
        until: Date.now() + 600_000
      });
      return true;
    });
  }
  @Cron('0 30 23 * * *', { timeZone: 'UTC' })
  async capture(): Promise<void> {
    if (this.config.get<string>('PORTFOLIO_DAILY_SNAPSHOTS_ENABLED') !== 'true' || !(await this.claim())) return;
    let succeeded = 0, failed = 0;
    try {
      const query = this.firebase.db.collectionGroup('portfolios').select('ownerUid', 'schemaVersion', 'archived').orderBy(FieldPath.documentId()).limit(50);
      let last: QueryDocumentSnapshot | null = null;
      for (; ;) {
        const page: QuerySnapshot = await (last ? query.startAfter(last) : query).get();
        for (const doc of page.docs) {
          if (!(await this.claim(true))) return;
          const row = doc.data();
          const parts = doc.ref.path.split('/');
          if (parts.length !== 4 || parts[0] !== 'users' || parts[2] !== 'portfolios' || row.ownerUid !== parts[1] || row.schemaVersion !== 1 || row.archived) continue;
          try {
            for (let attempt = 0; ; attempt += 1) {
              try {
                await this.portfolios.refreshObservation(parts[1], parts[3]);
                break;
              } catch (error) {
                // The shared saved-stock cache loads asynchronously on its first request.
                if (!(error instanceof ServiceUnavailableException) || attempt >= 19) throw error;
                await new Promise((resolve) => setTimeout(resolve, 1500));
              }
            }
            succeeded += 1;
          } catch {
            failed += 1;
          }
        }
        if (page.size < 50) break;
        last = page.docs[page.docs.length - 1];
      }
      this.logger.log(`Portfolio observations: ${succeeded} saved, ${failed} failed. No external market-data ingestion was started.`);
    } finally {
      const ref = this.firebase.db.collection('portfolioJobs').doc('daily-observations');
      await this.firebase.db.runTransaction(async (tx) => {
        if ((await tx.get(ref)).data()?.owner === this.owner) tx.delete(ref);
      });
    }
  }
}

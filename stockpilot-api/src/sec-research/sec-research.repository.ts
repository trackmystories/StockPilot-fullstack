import {Injectable} from '@nestjs/common';
import type {Transaction} from 'firebase-admin/firestore';
import {FirebaseService} from '../firebase/firebase.service';
import {
  LAYER_NAMES,
  type Checkpoint,
  type CompanyResearch,
  type ResearchLayers,
} from './sec-research.types';

@Injectable()
export class SecResearchRepository {
  constructor(private readonly firebase: FirebaseService) {}

  private get control() {
    return this.firebase.db.collection('secResearchControl').doc('lease');
  }

  async acquire(owner: string): Promise<boolean> {
    return this.firebase.db.runTransaction(async (tx) => {
      const state = (await tx.get(this.control)).data();
      if (state && state.expiresAt > Date.now()) return false;
      tx.set(this.control, {owner, expiresAt: Date.now() + 10 * 60 * 1000});
      return true;
    });
  }

  private async assertOwner(tx: Transaction, owner: string): Promise<void> {
    const state = (await tx.get(this.control)).data();
    if (state?.owner !== owner || state.expiresAt <= Date.now()) {
      throw new Error('SEC research lease was lost; this worker cannot publish.');
    }
  }

  async renew(owner: string): Promise<void> {
    await this.firebase.db.runTransaction(async (tx) => {
      await this.assertOwner(tx, owner);
      tx.update(this.control, {expiresAt: Date.now() + 10 * 60 * 1000});
    });
  }

  async release(owner: string): Promise<void> {
    await this.firebase.db.runTransaction(async (tx) => {
      const state = (await tx.get(this.control)).data();
      if (state?.owner === owner) tx.delete(this.control);
    });
  }

  async activeFinancialRun(): Promise<string> {
    const state = await this.firebase.db.collection('screenerState').doc('current').get();
    const runId = state.data()?.activeRun;
    if (typeof runId !== 'string') throw new Error('Run the financial intelligence refresh first.');
    return runId;
  }

  async runState(runId: string): Promise<Record<string, unknown> | null> {
    const doc = await this.firebase.db.collection('secResearchRuns').doc(runId).get();
    return doc.data() ?? null;
  }

  async saveRun(runId: string, value: Record<string, unknown>, owner: string): Promise<void> {
    await this.firebase.db.runTransaction(async (tx) => {
      await this.assertOwner(tx, owner);
      tx.set(this.firebase.db.collection('secResearchRuns').doc(runId), value, {merge: true});
    });
  }

  async checkpoints(runId: string): Promise<Map<string, Checkpoint>> {
    const rows = await this.firebase.db
      .collection('secResearchRuns')
      .doc(runId)
      .collection('stocks')
      .get();
    return new Map(rows.docs.map((row) => [row.id, row.data() as Checkpoint]));
  }

  async checkpoint(runId: string, value: Checkpoint, owner: string): Promise<void> {
    await this.firebase.db.runTransaction(async (tx) => {
      await this.assertOwner(tx, owner);
      tx.set(
        this.firebase.db
          .collection('secResearchRuns')
          .doc(runId)
          .collection('stocks')
          .doc(value.symbol),
        value,
      );
      tx.set(this.firebase.db.collection('secResearchSymbols').doc(value.symbol), {
        ...value,
        runId,
      });
    });
  }

  async company(cik: string): Promise<CompanyResearch | null> {
    const row = await this.firebase.db.collection('secResearchCompanies').doc(cik).get();
    return row.exists ? (row.data() as CompanyResearch) : null;
  }

  async publish(
    metadata: CompanyResearch,
    layers: ResearchLayers | null,
    owner: string,
  ): Promise<void> {
    const ref = this.firebase.db.collection('secResearchCompanies').doc(metadata.cik);
    await this.firebase.db.runTransaction(async (tx) => {
      await this.assertOwner(tx, owner);
      tx.set(ref, metadata);
      if (layers) {
        for (const name of LAYER_NAMES) tx.set(ref.collection('layers').doc(name), layers[name]);
      }
    });
  }

  async read(symbol: string): Promise<Record<string, unknown>> {
    const match = await this.firebase.db.collection('secResearchSymbols').doc(symbol).get();
    const mapping = match.data();
    if (!mapping?.cik) return {symbol, status: mapping?.status ?? 'not_prepared', layers: null};
    const ref = this.firebase.db.collection('secResearchCompanies').doc(mapping.cik);
    // A read transaction prevents mixing different published layer generations.
    return this.firebase.db.runTransaction(async (tx) => {
      const metadata = await tx.get(ref);
      const rows = await tx.getAll(
        ...LAYER_NAMES.map((name) => ref.collection('layers').doc(name)),
      );
      return {
        symbol,
        lastAttempt: mapping,
        metadata: metadata.data() ?? null,
        stale:
          !metadata.exists || Date.now() - Date.parse(metadata.data()?.checkedAt) > 7 * 86400000,
        layers: metadata.exists
          ? Object.fromEntries(rows.map((row) => [row.id, row.data()]))
          : null,
      };
    });
  }
}
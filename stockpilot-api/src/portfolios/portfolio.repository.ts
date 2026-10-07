import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { FirebaseService } from '../firebase/firebase.service';
import { MAX_TRANSACTIONS, PortfolioInputError, replayLedger } from './domain/ledger';
import { documentId } from './domain/portfolio-input';
import type { CreatePortfolioInput, PortfolioAnalysis, PortfolioInstrument, PortfolioObservation, PortfolioRecord, PortfolioTransaction, SavedScenario, ScenarioPreview, TransactionInput, UpdatePortfolioInput } from './portfolio.types';

export const fingerprint = (value: unknown): string => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const MAX_PORTFOLIOS = 25;
const MAX_SCENARIOS = 100;

@Injectable()
export class PortfolioRepository {
  constructor(private readonly firebase: FirebaseService) { }

  private collection(uid: string) {
    if (!uid || uid.includes('/') || uid.length > 128) throw new PortfolioInputError('Invalid authenticated user.');
    return this.firebase.db.collection('users').doc(uid).collection('portfolios');
  }
  private reference(uid: string, id: string) {
    return this.collection(uid).doc(documentId(id));
  }
  private owned(data: Record<string, unknown> | undefined, uid: string, allowDeleting = false): PortfolioRecord {
    if (!data || data.ownerUid !== uid || data.schemaVersion !== 1) throw new NotFoundException('Portfolio not found.');
    if (data.deleting && !allowDeleting) throw new ConflictException('Portfolio deletion is in progress. Retry deletion in settings.');
    return data as PortfolioRecord;
  }
  async list(uid: string): Promise<PortfolioRecord[]> {
    const snapshot = await this.collection(uid).limit(MAX_PORTFOLIOS + 1).get();
    if (snapshot.size > MAX_PORTFOLIOS) throw new PortfolioInputError('Too many portfolio records; no portfolios were silently omitted.');
    return snapshot.docs.map((doc) => this.owned(doc.data(), uid, true)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  async get(uid: string, id: string): Promise<PortfolioRecord> {
    return this.owned((await this.reference(uid, id).get()).data(), uid);
  }
  async create(uid: string, input: CreatePortfolioInput): Promise<PortfolioRecord> {
    const id = fingerprint(['portfolio', uid, input.requestId]).slice(0, 32);
    const ref = this.reference(uid, id);
    const counter = this.firebase.db.collection('users').doc(uid).collection('portfolioState').doc('limits');
    const tombstone = this.firebase.db.collection('users').doc(uid).collection('portfolioDeletions').doc(id);
    const createFingerprint = fingerprint(input);
    const now = new Date().toISOString();
    return this.firebase.db.runTransaction(async (tx) => {
      const deleted = await tx.get(tombstone);
      const existing = await tx.get(ref);
      if (deleted.exists) throw new ConflictException('This portfolio was deleted. Use a new creation request ID.');
      if (existing.exists) {
        const record = this.owned(existing.data(), uid);
        if (record.createFingerprint !== createFingerprint) throw new ConflictException('This request ID was already used with different portfolio details.');
        return record;
      }
      const currentCount = await tx.get(counter);
      const count = Number(currentCount.data()?.count ?? 0);
      if (!Number.isInteger(count) || count < 0 || count >= MAX_PORTFOLIOS) throw new PortfolioInputError(`Maximum ${MAX_PORTFOLIOS} portfolios per account, including archived portfolios.`);
      const record: PortfolioRecord = {
        id,
        ownerUid: uid,
        schemaVersion: 1,
        createFingerprint,
        name: input.name,
        currency: input.currency,
        ledgerCurrency: input.currency,
        deleting: false,
        kind: input.kind,
        archived: false,
        createdAt: now,
        updatedAt: now,
        revision: 0,
        transactionCount: 0,
        scenarioCount: 0,
        historyEpoch: 0,
        historyNote: null,
        ledger: replayLedger([], input.currency)
      };
      tx.create(ref, record);
      tx.set(counter, { count: count + 1 }, { merge: true });
      return record;
    });
  }
  async update(uid: string, id: string, input: UpdatePortfolioInput): Promise<PortfolioRecord> {
    const ref = this.reference(uid, id);
    return this.firebase.db.runTransaction(async (tx) => {
      const current = this.owned((await tx.get(ref)).data(), uid);
      const currencyChanged = input.currency !== undefined && input.currency !== current.currency;
      const patch = {
        ...input,
        ledgerCurrency: current.ledgerCurrency ?? current.ledger.currency ?? current.currency,
        updatedAt: new Date().toISOString(),
        ...(currencyChanged ? {
          revision: current.revision + 1,
          historyEpoch: current.historyEpoch + 1,
          historyNote: 'Display currency changed. Existing transaction currencies and purchase prices are unchanged. New observations use the selected currency.',
        } : {}),
      };
      const next: PortfolioRecord = {...current, ...patch};
      tx.update(ref, patch);
      return next;
    });
  }
  async transactions(uid: string, id: string): Promise<PortfolioTransaction[]> {
    const portfolio = await this.get(uid, id);
    const snapshot = await this.reference(uid, id).collection('transactions').orderBy('sequence').limit(MAX_TRANSACTIONS + 1).get();
    if (snapshot.size > MAX_TRANSACTIONS) throw new PortfolioInputError('Transaction limit exceeded; the ledger was not truncated.');
    return snapshot.docs.map((doc) => {
      const event = doc.data() as PortfolioTransaction;
      return {...event, currency: event.instrument?.currency ?? event.currency ?? portfolio.ledgerCurrency ?? portfolio.currency};
    });
  }
  async append(uid: string, id: string, input: TransactionInput, instrument: PortfolioInstrument | null): Promise<PortfolioRecord> {
    const ref = this.reference(uid, id);
    const eventRef = ref.collection('transactions').doc(documentId(input.requestId));
    const digest = fingerprint(input);
    const now = new Date().toISOString();
    return this.firebase.db.runTransaction(async (tx) => {
      const current = this.owned((await tx.get(ref)).data(), uid);
      const duplicate = await tx.get(eventRef);
      if (duplicate.exists) {
        if (duplicate.data()?.fingerprint !== digest) throw new ConflictException('This request ID was used for a different transaction.');
        return current;
      }
      if (current.archived) throw new PortfolioInputError('Restore this portfolio before recording transactions.');
      if (current.transactionCount >= MAX_TRANSACTIONS) throw new PortfolioInputError(`Maximum ${MAX_TRANSACTIONS} transactions per portfolio.`);
      const snapshot = await tx.get(ref.collection('transactions').orderBy('sequence').limit(MAX_TRANSACTIONS + 1));
      const events = snapshot.docs.map((doc) => doc.data() as PortfolioTransaction);
      if (events.length !== current.transactionCount) throw new ConflictException('Portfolio ledger needs repair; no transaction was recorded.');
      const event: PortfolioTransaction = {
        ...input,
        instrument,
        currency: instrument?.currency ?? input.currency ?? current.ledgerCurrency ?? current.currency,
        id: input.requestId,
        sequence: current.transactionCount + 1,
        createdAt: now,
        voidedAt: null,
        fingerprint: digest
      };
      const ledger = replayLedger([...events, event], current.ledgerCurrency ?? current.ledger.currency ?? current.currency);
      if (Buffer.byteLength(JSON.stringify(ledger)) > 650_000) throw new PortfolioInputError('Portfolio state exceeds the supported size.');
      const backdated = input.date < now.slice(0, 10);
      const patch = {
        ledger,
        transactionCount: current.transactionCount + 1,
        revision: current.revision + 1,
        updatedAt: now,
        historyEpoch: current.historyEpoch + (backdated ? 1 : 0),
        historyNote: backdated ? 'Earlier observations were reset after a backdated ledger change. No historical returns were reconstructed.' : current.historyNote
      };
      // All reads and domain validation happen before any writes.
      tx.create(eventRef, event);
      tx.update(ref, patch);
      return {
        ...current,
        ...patch
      };
    });
  }
  async voidTransaction(uid: string, id: string, transactionId: string): Promise<PortfolioRecord> {
    const ref = this.reference(uid, id);
    const eventRef = ref.collection('transactions').doc(documentId(transactionId));
    const now = new Date().toISOString();
    return this.firebase.db.runTransaction(async (tx) => {
      const current = this.owned((await tx.get(ref)).data(), uid);
      const target = await tx.get(eventRef);
      if (!target.exists) throw new NotFoundException('Transaction not found.');
      if (target.data()?.voidedAt) return current;
      if (current.archived) throw new PortfolioInputError('Restore this portfolio before correcting transactions.');
      const snapshot = await tx.get(ref.collection('transactions').orderBy('sequence').limit(MAX_TRANSACTIONS + 1));
      const events = snapshot.docs.map((doc) => ({
        ...doc.data(),
        ...(doc.id === transactionId ? { voidedAt: now } : {})
      }) as PortfolioTransaction);
      if (events.length !== current.transactionCount) {
        throw new ConflictException('Portfolio ledger needs repair; no transaction was voided.');
      }
      const ledger = replayLedger(events, current.ledgerCurrency ?? current.ledger.currency ?? current.currency);
      const patch = {
        ledger,
        revision: current.revision + 1,
        updatedAt: now,
        historyEpoch: current.historyEpoch + 1,
        historyNote: 'Earlier observations were reset after a transaction correction. Original entries remain visible in Activity.'
      };
      tx.update(eventRef, { voidedAt: now });
      tx.update(ref, patch);
      return {
        ...current,
        ...patch
      };
    });
  }
  async persistAnalysis(uid: string, record: PortfolioRecord, analysis: PortfolioAnalysis): Promise<boolean> {
    const ref = this.reference(uid, record.id);
    const date = analysis.calculatedAt.slice(0, 10);
    const observation: PortfolioObservation = {
      date,
      observedAt: analysis.calculatedAt,
      value: analysis.holdingsValue,
      currency: analysis.currency,
      reportingVersion: 2,
      fxAsOf: analysis.fx?.asOf ?? null,
      netCashDeposits: analysis.netCashDeposits,
      revision: record.revision,
      runId: analysis.runId,
      epoch: record.historyEpoch
    };
    return this.firebase.db.runTransaction(async (tx) => {
      const latest = this.owned((await tx.get(ref)).data(), uid);
      if (latest.revision !== record.revision || latest.historyEpoch !== record.historyEpoch || latest.currency !== analysis.currency) return false;
      tx.set(ref.collection('analysis').doc('current'), {
        analysis,
        epoch: record.historyEpoch
      });
      // Cash flow changes the observed value; these points are not investment returns.
      tx.set(ref.collection('observations').doc(date), observation);
      return true;
    });
  }
  async cachedAnalysis(uid: string, id: string): Promise<{
    analysis: PortfolioAnalysis;
    epoch: number;
  } | null> {
    await this.get(uid, id);
    const data = (await this.reference(uid, id).collection('analysis').doc('current').get()).data();
    return data ? data as {
      analysis: PortfolioAnalysis;
      epoch: number;
    } : null;
  }
  async history(uid: string, id: string, epoch: number): Promise<PortfolioObservation[]> {
    const portfolio = await this.get(uid, id);
    const snapshot = await this.reference(uid, id).collection('observations').orderBy('date', 'desc').limit(366).get();
    return snapshot.docs.map((doc) => doc.data() as PortfolioObservation).filter((point) => point.epoch === epoch && point.reportingVersion === 2 && point.currency === portfolio.currency).reverse();
  }
  async scenarios(uid: string, id: string): Promise<{
    id: string;
    name: string;
    createdAt: string;
  }[]> {
    await this.get(uid, id);
    const snapshot = await this.reference(uid, id).collection('scenarios').orderBy('createdAt', 'desc').select('name', 'createdAt').limit(MAX_SCENARIOS).get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      name: String(doc.data().name),
      createdAt: String(doc.data().createdAt)
    }));
  }
  async scenario(uid: string, id: string, scenarioId: string): Promise<SavedScenario> {
    await this.get(uid, id);
    const doc = await this.reference(uid, id).collection('scenarios').doc(documentId(scenarioId)).get();
    if (!doc.exists) throw new NotFoundException('Scenario not found.');
    const data = doc.data()!;
    return {
      id: doc.id,
      name: data.name,
      createdAt: data.createdAt,
      preview: data.preview
    } as SavedScenario;
  }
  async existingScenario(uid: string, id: string, requestId: string, digest: string): Promise<SavedScenario | null> {
    await this.get(uid, id);
    const doc = await this.reference(uid, id).collection('scenarios').doc(documentId(requestId)).get();
    if (!doc.exists) return null;
    if (doc.data()?.fingerprint !== digest) throw new ConflictException('Request ID was used for another scenario.');
    const data = doc.data()!;
    return {
      id: doc.id,
      name: data.name,
      createdAt: data.createdAt,
      preview: data.preview
    } as SavedScenario;
  }
  async existingTransaction(uid: string, id: string, input: TransactionInput): Promise<boolean> {
    await this.get(uid, id);
    const doc = await this.reference(uid, id).collection('transactions').doc(documentId(input.requestId)).get();
    if (!doc.exists) return false;
    if (doc.data()?.fingerprint !== fingerprint(input)) throw new ConflictException('Request ID was used for another transaction.');
    return true;
  }
  async saveScenario(uid: string, id: string, requestId: string, preview: ScenarioPreview, digest: string): Promise<SavedScenario> {
    const ref = this.reference(uid, id);
    const scenarioRef = ref.collection('scenarios').doc(documentId(requestId));
    if (Buffer.byteLength(JSON.stringify(preview)) > 800_000) throw new PortfolioInputError('This scenario is too large to save.');
    return this.firebase.db.runTransaction(async (tx) => {
      const current = this.owned((await tx.get(ref)).data(), uid);
      const existing = await tx.get(scenarioRef);
      if (existing.exists) {
        if (existing.data()?.fingerprint !== digest) throw new ConflictException('Request ID was used for another scenario.');
        return existing.data() as SavedScenario;
      }
      if (current.archived) throw new PortfolioInputError('Restore this portfolio before saving a scenario.');
      if (current.revision !== preview.portfolioRevision) throw new ConflictException('The portfolio changed. Preview the scenario again.');
      if (current.scenarioCount >= MAX_SCENARIOS) throw new PortfolioInputError(`Maximum ${MAX_SCENARIOS} saved scenarios per portfolio.`);
      const saved: SavedScenario = {
        id: requestId,
        name: preview.input.name,
        createdAt: new Date().toISOString(),
        preview
      };
      tx.create(scenarioRef, {
        ...saved,
        fingerprint: digest
      });
      tx.update(ref, { scenarioCount: current.scenarioCount + 1 });
      return saved;
    });
  }

  async settings(uid: string, id: string): Promise<PortfolioRecord> {
    // A partially deleted portfolio remains reachable here so the user can retry deletion.
    return this.owned((await this.reference(uid, id).get()).data(), uid, true);
  }

  async delete(uid: string, id: string): Promise<{success: true; id: string}> {
    const ref = this.reference(uid, id);
    const marker = this.firebase.db.collection('users').doc(uid).collection('portfolioDeletions').doc(id);
    const counter = this.firebase.db.collection('users').doc(uid).collection('portfolioState').doc('limits');
    const alreadyComplete = await this.firebase.db.runTransaction(async (tx) => {
      const deletion = await tx.get(marker);
      const snapshot = await tx.get(ref);
      if (deletion.exists && deletion.data()?.ownerUid !== uid) throw new NotFoundException('Portfolio not found.');
      if (deletion.data()?.status === 'complete') return true;
      const record = this.owned(snapshot.data(), uid, true);
      if (!record.deleting) tx.update(ref, {deleting: true, revision: record.revision + 1});
      if (!deletion.exists) tx.create(marker, {ownerUid: uid, status: 'pending', startedAt: new Date().toISOString()});
      return false;
    });
    if (alreadyComplete) return {success: true, id};

    // Keep the locked parent until EVERY descendant is deleted. Never delete the parent first.
    // Failed operations remain retryable; all normal writes check the parent deletion flag.
    const collections = await ref.listCollections();
    for (const collection of collections) await this.firebase.db.recursiveDelete(collection);

    await this.firebase.db.runTransaction(async (tx) => {
      const deletion = await tx.get(marker);
      const snapshot = await tx.get(ref);
      const limits = await tx.get(counter);
      if (deletion.data()?.ownerUid !== uid) throw new NotFoundException('Portfolio not found.');
      if (deletion.data()?.status === 'complete') return;
      const record = this.owned(snapshot.data(), uid, true);
      if (!record.deleting) throw new ConflictException('Portfolio deletion state changed.');
      const count = Number(limits.data()?.count);
      if (!Number.isInteger(count) || count < 1) throw new ConflictException('Portfolio count needs repair before deletion can finish.');
      tx.delete(ref);
      tx.set(counter, {count: count - 1}, {merge: true});
      // No holdings, transactions or names are retained in this idempotency tombstone.
      tx.set(marker, {ownerUid: uid, status: 'complete', completedAt: new Date().toISOString()});
    });
    return {success: true, id};
  }
}

import {Injectable} from '@nestjs/common';
import type {Transaction} from 'firebase-admin/firestore';
import {FirebaseService} from '../firebase/firebase.service';
import {SecResearchRepository} from '../sec-research/sec-research.repository';
import {emptyLayers, LAYER_NAMES} from '../sec-research/sec-research.types';
import {record, reportSecRevision} from './report-builder';
import type {
  CompanyReport,
  ReportCheckpoint,
  ReportInput,
  ReportJob,
  ReportSection,
  ReportTable,
} from './report.types';

const LEASE_MS = 5 * 60 * 1000;

type StoredReportTable = Omit<ReportTable, 'rows'> & {
  rows: {cells: string[]}[];
};

type StoredCompanyReport = Omit<CompanyReport, 'sections'> & {
  sections: (Omit<ReportSection, 'tables'> & {tables: StoredReportTable[]})[];
};

@Injectable()
export class ReportRepository {
  constructor(
    private readonly firebase: FirebaseService,
    private readonly secResearch: SecResearchRepository,
  ) {}

  private get control() {
    return this.firebase.db.collection('stockReportControl').doc('current');
  }

  async activeRun(): Promise<string> {
    const state = await this.firebase.db.collection('screenerState').doc('current').get();
    const runId = state.data()?.activeRun;
    if (typeof runId !== 'string' || !runId)
      throw new Error('No published financial universe is available.');
    return runId;
  }

  async acquire(owner: string, runId: string): Promise<boolean> {
    return this.firebase.db.runTransaction(async (tx) => {
      const state = (await tx.get(this.control)).data();
      if (state?.owner && state.expiresAt > Date.now()) return false;
      tx.set(this.control, {owner, runId, expiresAt: Date.now() + LEASE_MS});
      return true;
    });
  }

  private async assertOwner(tx: Transaction, owner: string): Promise<void> {
    const state = (await tx.get(this.control)).data();
    if (state?.owner !== owner || state.expiresAt <= Date.now()) {
      throw new Error('Report lease expired or was replaced; this worker cannot publish.');
    }
  }

  async renew(owner: string): Promise<void> {
    await this.firebase.db.runTransaction(async (tx) => {
      await this.assertOwner(tx, owner);
      tx.update(this.control, {expiresAt: Date.now() + LEASE_MS});
    });
  }

  async release(owner: string): Promise<void> {
    await this.firebase.db.runTransaction(async (tx) => {
      const state = (await tx.get(this.control)).data();
      if (state?.owner === owner) tx.update(this.control, {owner: null, expiresAt: 0});
    });
  }

  async saveJob(job: ReportJob, owner: string): Promise<void> {
    await this.firebase.db.runTransaction(async (tx) => {
      await this.assertOwner(tx, owner);
      tx.set(this.firebase.db.collection('stockReportRuns').doc(job.runId), job);
    });
  }

  async status(): Promise<ReportJob | null> {
    return this.firebase.db.runTransaction(async (tx) => {
      const control = (await tx.get(this.control)).data();
      if (!control?.runId) return null;
      const snapshot = await tx.get(
        this.firebase.db.collection('stockReportRuns').doc(control.runId),
      );
      if (!snapshot.exists) return null;
      const job = snapshot.data() as ReportJob;
      if (job.status === 'running' && (!control.owner || control.expiresAt <= Date.now())) {
        return {
          ...job,
          status: 'interrupted',
          activeSymbols: [],
          error:
            'Worker stopped or its lease expired. Start the report job again to resume from saved reports.',
        };
      }
      return job;
    });
  }

  async readInput(runId: string, symbol: string, companyName: string): Promise<ReportInput> {
    const run = this.firebase.db.collection('screenerRuns').doc(runId);
    const [financialRows, sec] = await Promise.all([
      this.firebase.db.getAll(
        run.collection('intelligence').doc(symbol),
        run.collection('scorecards').doc(symbol),
        run.collection('preparedInputs').doc(symbol),
      ),
      this.secResearch.read(symbol),
    ]);
    const layers = emptyLayers();
    const savedLayers = record(sec.layers);
    for (const name of LAYER_NAMES) {
      const layer = record(savedLayers[name]);
      if (Array.isArray(layer.evidence)) {
        layers[name] = {
          status: layer.evidence.length ? 'evidence_available' : 'no_evidence',
          evidence: layer.evidence,
          omittedEvidenceCount:
            typeof layer.omittedEvidenceCount === 'number' ? layer.omittedEvidenceCount : 0,
        };
      }
    }
    const prepared = financialRows[2]?.exists ? record(financialRows[2].data()) : {};
    const income = record(prepared.financials).income;
    const financialHistory = Array.isArray(income)
      ? {
          preparedAt: typeof prepared.preparedAt === 'string' ? prepared.preparedAt : null,
          income: income.map((value) => {
            const row = record(value);
            return Object.fromEntries(
              ['symbol', 'date', 'period', 'reportedCurrency', 'revenue', 'netIncome'].map(
                (key) => [key, row[key] ?? null],
              ),
            );
          }),
        }
      : null;
    const attempt = record(sec.lastAttempt);
    return {
      symbol,
      companyName,
      sourceRunId: runId,
      financialHistory,
      financial: financialRows[0].exists ? financialRows[0].data()! : null,
      scorecard: financialRows[1].exists ? financialRows[1].data()! : null,
      sec: {
        metadata: sec.metadata ? record(sec.metadata) : null,
        layers,
        status:
          typeof attempt.status === 'string'
            ? attempt.status
            : String(sec.status ?? 'not_prepared'),
      },
    };
  }

  async readReport(symbol: string): Promise<CompanyReport | null> {
    const snapshot = await this.firebase.db.collection('stockReports').doc(symbol).get();
    if (!snapshot.exists) return null;
    const saved = snapshot.data() as StoredCompanyReport | CompanyReport;
    return {
      ...saved,
      sections: saved.sections.map((section) => ({
        ...section,
        tables: section.tables.map((table) => ({
          ...table,
          rows: table.rows.map((row) => (Array.isArray(row) ? row : row.cells)),
        })),
      })),
    };
  }

  async currentSecRevision(symbol: string): Promise<string> {
    const mapping = await this.firebase.db.collection('secResearchSymbols').doc(symbol).get();
    const cik = mapping.data()?.cik;
    const status = String(mapping.data()?.status ?? 'not_prepared');
    if (typeof cik !== 'string') return reportSecRevision(null, status);
    const company = await this.firebase.db.collection('secResearchCompanies').doc(cik).get();
    return reportSecRevision(company.data() ?? null, status);
  }

  async publish(
    runId: string,
    checkpoint: ReportCheckpoint,
    report: CompanyReport | null,
    owner: string,
  ): Promise<void> {
    // Firestore allows arrays of objects, but not arrays directly inside arrays.
    // Keep the public API's string[][] format and adapt only at the storage boundary.
    const stored: StoredCompanyReport | null = report
      ? {
          ...report,
          sections: report.sections.map((section) => ({
            ...section,
            tables: section.tables.map((table) => ({
              ...table,
              rows: table.rows.map((cells) => ({cells})),
            })),
          })),
        }
      : null;
    if (stored && Buffer.byteLength(JSON.stringify(stored)) > 850000) {
      throw new Error(
        'Report exceeds the safe Firestore document size. Previous report retained.',
      );
    }
    await this.firebase.db.runTransaction(async (tx) => {
      await this.assertOwner(tx, owner);
      if (stored)
        tx.set(this.firebase.db.collection('stockReports').doc(checkpoint.symbol), stored);
      tx.set(
        this.firebase.db
          .collection('stockReportRuns')
          .doc(runId)
          .collection('stocks')
          .doc(checkpoint.symbol),
        checkpoint,
      );
    });
  }
}
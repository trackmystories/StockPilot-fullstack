import type {PreparedInput} from '../prepared-stock.type';
import type {StockIntelligence} from '../types';
export const AUDIT_VERSION = 2;
export const SUPPORTED_CALCULATION_VERSION = 2;
export const SUPPORTED_CALCULATION_VERSIONS = [2, 3];
export type AuditReason =
  | 'missing_field'
  | 'missing_period'
  | 'mapping_issue'
  | 'invalid_value'
  | 'period_mismatch'
  | 'currency_mismatch'
  | 'not_applicable'
  | 'stale_input'
  | 'insufficient_peers'
  | 'provenance_unavailable'
  | 'calculation_gap'
  | 'incomplete_score'
  | 'score_unavailable';
export type EvidenceIssue = {
  reason: AuditReason;
  path: string;
  field: string;
  period: string;
  observed: string | number | null;
  currency: string | null;
  detail: string;
};
export type Trace = {value: number | null; issues: EvidenceIssue[]};
export type AuditFinding = EvidenceIssue & {
  id: string;
  symbol: string;
  sourceRunId: string;
  affectedMetrics: string[];
  affectedScores: string[];
  affectedLists: string[];
  blocksAuditReadiness: boolean;
  researchCandidate: boolean;
  suggestedAction: string;
};
export type AuditStatus =
  'qualified' | 'did_not_qualify' | 'insufficient_evidence' | 'not_applicable' | 'not_evaluated';
export type SavedListResult = {score: number; coverage: number; eligible?: boolean; reasons?: string[]};
export type StockAudit = {
  symbol: string;
  sourceRunId: string;
  auditVersion: number;
  sourceCalculationVersion: number;
  sourcePreparedAt: string;
  auditedAsOf: string;
  metrics: Record<string, {value: number | null; findingIds: string[]}>;
  scores: Record<
    string,
    {savedScore: number | null; savedCoverage: number | null; evidence: 'complete' | 'incomplete'; findingIds: string[]}
  >;
  lists: Record<
    string,
    {
      status: AuditStatus;
      productionQualified: boolean | null;
      savedScore: number | null;
      savedCoverage: number | null;
      reasons: string[];
      findingIds: string[];
    }
  >;
  findings: AuditFinding[];
  limitations: string[];
};
export type AuditOptions = {sourceRunId: string; asOf: string};
export type SourceBundle = {
  input: PreparedInput;
  scorecard: StockIntelligence | null;
  calculations: Record<string, SavedListResult>;
};
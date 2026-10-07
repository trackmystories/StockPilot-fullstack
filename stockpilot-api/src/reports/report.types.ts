import type {ResearchLayers} from '../sec-research/sec-research.types';

export const REPORT_VERSION = 3;

export type ReportSource = {
  id: string;
  kind: 'sec' | 'calculation';
  label: string;
  asOf: string | null;
  url: string | null;
  documentPath: string;
  fieldPath: string;
  accession: string | null;
  reportDate: string | null;
  sha256: string | null;
};

export type ReportStatement = {
  id: string;
  kind: 'calculation' | 'forecast' | 'issuer' | 'management';
  title: string;
  text: string;
  context: string | null;
  sourceIds: string[];
};

export type ReportTable = {
  title: string;
  columns: string[];
  rows: string[][];
  sourceIds: string[];
};

export type ReportSection = {
  id: string;
  title: string;
  description: string;
  statements: ReportStatement[];
  tables: ReportTable[];
  notes: string[];
};

export type ReportParagraph = {
  id: string;
  kind: 'fact' | 'model' | 'forecast' | 'disclosure' | 'explanation';
  text: string;
  sourceIds: string[];
};

export type ReportChart = {
  id: string;
  title: string;
  description: string;
  kind: 'reported' | 'forecast' | 'model';
  unit: string;
  points: {label: string; value: number; sourceIds: string[]}[];
  footnote: string;
};

export type ReportArticleSection = {
  id: string;
  title: string;
  paragraphs: ReportParagraph[];
  charts: ReportChart[];
  evidenceIds: string[];
};

export type ReportArticle = {
  headline: string;
  introduction: string;
  sections: ReportArticleSection[];
};

export type CompanyReport = {
  article?: ReportArticle;
  version: number;
  symbol: string;
  companyName: string;
  sourceRunId: string;
  fingerprint: string;
  generatedAt: string;
  financialAsOf: string | null;
  secAsOf: string | null;
  secRevision: string | null;
  status: 'available' | 'limited';
  summary: ReportStatement[];
  sections: ReportSection[];
  sources: ReportSource[];
  coverage: {
    financials: boolean;
    secLayers: number;
    totalSecLayers: number;
    gaps: string[];
  };
  methodology: string;
};

export type ReportInput = {
  financialHistory?: {
    preparedAt: string | null;
    income: Record<string, unknown>[];
  } | null;
  symbol: string;
  companyName: string;
  sourceRunId: string;
  financial: {
    analysis?: Record<string, unknown>;
    calculatedAt?: number;
    calculationVersion?: number;
    analysisVersion?: number;
  } | null;
  scorecard: {
    data?: Record<string, unknown>;
    calculatedAt?: number;
    calculationVersion?: number;
  } | null;
  sec: {
    metadata: Record<string, unknown> | null;
    layers: ResearchLayers;
    status: string;
  };
};

export type ReportCheckpoint = {
  symbol: string;
  fingerprint: string | null;
  status: 'generated' | 'unchanged' | 'failed';
  coverage: 'available' | 'limited' | null;
  checkedAt: string;
  error: string | null;
};

export type ReportJob = {
  runId: string;
  sourceRunId: string;
  version: number;
  status: 'running' | 'complete' | 'partial' | 'interrupted';
  total: number;
  processed: number;
  generated: number;
  unchanged: number;
  limited: number;
  failed: number;
  activeSymbols: string[];
  startedAt: string;
  updatedAt: string;
  completedAt: string | null;
  error: string | null;
};

export type ReportResponse = {
  symbol: string;
  status: 'ready' | 'not_prepared';
  stale: boolean;
  report: CompanyReport | null;
};
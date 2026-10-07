// API contract for the saved company report endpoint.
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

export type ReportResponse = {
  symbol: string;
  status: 'ready' | 'not_prepared';
  stale: boolean;
  report: CompanyReport | null;
};
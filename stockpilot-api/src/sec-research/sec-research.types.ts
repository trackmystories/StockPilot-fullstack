import {createHash} from 'node:crypto';

export const EXTRACTOR_VERSION = 1;
export const LAYER_NAMES = [
  'businessProfile',
  'operatingKpis',
  'managementExplanations',
  'materialEvents',
  'riskFactors',
  'segmentIntelligence',
] as const;
export type LayerName = (typeof LAYER_NAMES)[number];
export type Filing = {
  accession: string;
  form: string;
  filedAt: string;
  reportDate: string;
  primaryDocument: string;
};
export type EvidenceSource = Omit<Filing, 'primaryDocument'> & {
  cik: string;
  url: string;
  rawPath: string;
  sha256: string;
};
export type Evidence = {
  id: string;
  quote: string;
  context: string;
  section: string;
  block: number;
  table: string | null;
  attribution: 'management' | 'issuer_disclosure';
  interpretation: 'source_excerpt_not_independently_verified';
  source: EvidenceSource;
};
export type ResearchLayer = {
  status: 'evidence_available' | 'no_evidence';
  evidence: Evidence[];
  omittedEvidenceCount: number;
};
export type ResearchLayers = Record<LayerName, ResearchLayer>;
export type Extraction = {
  version: number;
  source: EvidenceSource | null;
  layers: ResearchLayers;
  warnings: string[];
};
export type CompanyResearch = {
  cik: string;
  fingerprint: string;
  extractorVersion: number;
  preparedAt: string;
  checkedAt: string;
  windowStart: string;
  filingCount: number;
  documentCount: number;
  coverage: 'evidence_available' | 'no_evidence' | 'partial';
  selectionMode?: 'focused' | 'backfill';
  selectedFilingCount?: number;
  failedFilingCount?: number;
  omittedWarningCount: number;
  warnings: string[];
};
export type Checkpoint = {
  symbol: string;
  cik: string | null;
  status: 'prepared' | 'partial' | 'unchanged' | 'no_sec_match' | 'failed';
  checkedAt: string;
  error: string | null;
};
export type ResearchRun = {
  runId: string;
  status: 'complete' | 'partial';
  total: number;
  completed: number;
  failed: number;
  noSecMatch: number;
  partial?: number;
};
export const hash = (value: string | Buffer): string =>
  createHash('sha256').update(value).digest('hex');
export const emptyLayers = (): ResearchLayers =>
  Object.fromEntries(
    LAYER_NAMES.map((name) => [
      name,
      {
        status: 'no_evidence',
        evidence: [],
        omittedEvidenceCount: 0,
      },
    ]),
  ) as unknown as ResearchLayers;

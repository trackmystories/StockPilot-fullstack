import type {CompanyData} from './calculator.type';
export type StockTheme = 'ai' | 'semiconductors' | 'data-centers' | 'energy' | 'cybersecurity' | 'robotics';
export type ThemeResult = {score: number; coverage: number; matches: boolean};

const normalize = (value: string | null): string => {
  return (value ?? '').trim().toLowerCase();
};

const containsAny = (text: string, terms: string[]): boolean => {
  return terms.some((term) => new RegExp(`\\b${term}\\b`, 'i').test(text));
};

const themeTerms: Record<StockTheme, string[]> = {
  ai: [
    'artificial intelligence',
    'machine learning',
    'generative ai',
    'ai software',
    'ai infrastructure',
    'deep learning',
  ],
  semiconductors: ['semiconductor', 'semiconductors', 'chip', 'integrated circuit'],
  'data-centers': ['data center', 'data centre', 'datacenter', 'cloud infrastructure', 'server infrastructure'],
  energy: ['energy', 'oil', 'gas', 'solar', 'renewable', 'nuclear', 'uranium', 'power generation'],
  cybersecurity: ['cybersecurity', 'cyber security', 'network security', 'information security'],
  robotics: ['robotics', 'robotic', 'automation equipment', 'industrial automation'],
};

export const calculateTheme = (company: CompanyData, theme: StockTheme): ThemeResult => {
  const companyName = normalize(company.companyName);
  const sector = normalize(company.sector);
  const industry = normalize(company.industry);
  const searchable = [companyName, sector, industry].join(' ');
  const terms = themeTerms[theme];
  const matches = containsAny(searchable, terms);
  return {score: matches ? 100 : 0, coverage: industry ? 100 : sector ? 70 : companyName ? 40 : 0, matches};
};

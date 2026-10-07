export const SCORE_KEYS = ['overall', 'quality', 'growth', 'valuation', 'financialHealth', 'momentum', 'risk', 'volatility'] as const;
export type ScoreKey = (typeof SCORE_KEYS)[number];
export type FilterSort = 'symbol' | 'overall' | 'risk';
export type FilterNode = {
  id: string;
  label: string;
  count: number;
  children?: FilterNode[];
};
export type FilterSection = {
  id: string;
  title: string;
  mode: 'single' | 'multiple';
  description?: string;
  options: FilterNode[];
};
export type FilterStock = {
  symbol: string;
  companyName: string;
  logoUrl: string | null;
  exchange: string | null;
  sector: string | null;
  industry: string | null;
  currency: string | null;
  price: number | null;
  marketCap: number | null;
  changePercentage: number | null;
  quoteAsOf: string | null;
  calculatedAt: string | null;
  stale: boolean;
  score: number | null;
  coverage: number | null;
  riskScore: number | null;
  riskLevel: 'low' | 'medium' | 'high' | null;
  volatilityScore: number | null;
  scores: Record<ScoreKey, number | null>;
  metrics: Record<string, number | null>;
  secMetricsIncluded: boolean;
};
export type FilterQuery = {
  selectedIds: string[];
  sort: FilterSort;
  offset: number;
  limit: number;
  runId: string;
};
export type FilterLoading = {
  status: 'loading';
  message: string;
};
export type FilterOptions = {
  status: 'ready';
  runId: string;
  total: number;
  loadedAt: string;
  sections: FilterSection[];
};
export type FilterResults = {
  status: 'ready';
  runId: string;
  total: number;
  items: FilterStock[];
  nextOffset: number | null;
  loadedAt: string;
};
export type StockFilterRoutes = {
  StockFilter: {
    selectedIds?: string[];
    resultRouteKey?: string;
  } | undefined;
  StockFilterList: {
    selectedIds: string[];
    runId: string;
  };
};
export function leafIds(node: FilterNode): string[] {
  return node.children?.length ? node.children.flatMap(leafIds) : [node.id];
}
export function sectionIds(section: FilterSection): string[] {
  return section.options.flatMap(leafIds);
}
export function matchingSections(sections: FilterSection[], search: string): FilterSection[] {
  const query = search.trim().toLocaleLowerCase();
  if (!query)
    return sections;
  const matches = (node: FilterNode): FilterNode | null => {
    if (node.label.toLocaleLowerCase().includes(query))
      return node;
    const children = node.children?.map(matches).filter((child): child is FilterNode => child !== null);
    return children?.length ? {...node, children} : null;
  };
  return sections.flatMap((section) => {
    if (section.title.toLocaleLowerCase().includes(query))
      return [section];
    const options = section.options.map(matches).filter((node): node is FilterNode => node !== null);
    return options.length ? [{...section, options}] : [];
  });
}
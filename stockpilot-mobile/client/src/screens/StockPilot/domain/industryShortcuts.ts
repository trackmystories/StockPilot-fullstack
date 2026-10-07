import type {FilterNode, FilterOptions, StockFilterRoutes} from '../../StockFilter/domain/stockFilter';
export type IndustryShortcut = {
  key: string;
  label: string;
};
export const INDUSTRY_SHORTCUTS: IndustryShortcut[] = [
  {key: 'silver', label: 'Silver'},
  {key: 'steel', label: 'Steel'},
  {key: 'gold', label: 'Gold'},
  {key: 'copper', label: 'Copper'},
  {key: 'other-precious-metals', label: 'Other Precious Metals'},
];
const normalizeLabel = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();
export function getIndustryShortcutParams(
  options: FilterOptions,
  label: string,
): StockFilterRoutes['StockFilterList'] {
  if (!options.runId?.trim()) {
    throw new Error('The saved filters have no active run. Please try again.');
  }
  const target = normalizeLabel(label);
  const industrySection = options.sections.find((section) => section.id === 'industry');
  const findIds = (nodes: FilterNode[]): string[] =>
    nodes.flatMap((node) => {
      if (node.children) {
        return findIds(node.children);
      }
      return node.count > 0 && node.id.trim() && normalizeLabel(node.label) === target
        ? [node.id]
        : [];
    });
  // Reuse the API's exact industry leaf IDs; never select a sector or invent IDs.
  const selectedIds = [...new Set(findIds(industrySection?.options ?? []))];
  if (selectedIds.length === 0) {
    throw new Error(`${label} is not available in the current saved industry filters.`);
  }
  return {selectedIds, runId: options.runId};
}
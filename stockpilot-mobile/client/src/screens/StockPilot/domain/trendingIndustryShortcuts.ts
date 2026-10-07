import type {FilterNode, FilterOptions, StockFilterRoutes} from '../../StockFilter/domain/stockFilter';
export type TrendingIndustryKey =
  | 'aerospace-defense'
  | 'marine-shipping'
  | 'semiconductors'
  | 'media-entertainment';
export type TrendingIndustryShortcut = {
  key: TrendingIndustryKey;
  label: string;
  displayLabel: string;
  icon: 'airplane-outline' | 'boat-outline' | 'hardware-chip-outline' | 'film-outline';
  inline: boolean;
  industryLabels: readonly string[];
};
export const TRENDING_INDUSTRIES: readonly TrendingIndustryShortcut[] = [
  {
    key: 'aerospace-defense',
    label: 'Aerospace & Defence',
    displayLabel: 'Aerospace\n& Defence',
    icon: 'airplane-outline',
    inline: true,
    industryLabels: ['Aerospace & Defense'],
  },
  {
    key: 'marine-shipping',
    label: 'Marine Shipping',
    displayLabel: 'Marine\nShipping',
    icon: 'boat-outline',
    inline: true,
    industryLabels: ['Marine Shipping'],
  },
  {
    key: 'semiconductors',
    label: 'Semiconductors',
    displayLabel: 'Semiconductors',
    icon: 'hardware-chip-outline',
    inline: false,
    industryLabels: ['Semiconductors'],
  },
  {
    key: 'media-entertainment',
    label: 'Media & Entertainment',
    displayLabel: 'Media &\nEntertainment',
    icon: 'film-outline',
    inline: false,
    industryLabels: ['Media & Entertainment', 'Media', 'Entertainment'],
  },
];
const normalizeLabel = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bdefence\b/g, 'defense')
    .replace(/\s+/g, ' ');
export function getTrendingIndustryParams(
  options: FilterOptions,
  key: TrendingIndustryKey,
): StockFilterRoutes['StockFilterList'] {
  if (!options.runId?.trim()) {
    throw new Error('The saved filters have no active run. Please try again.');
  }
  const shortcut = TRENDING_INDUSTRIES.find((item) => item.key === key);
  if (!shortcut) {
    throw new Error('This industry shortcut is not available.');
  }
  const labels = new Set(shortcut.industryLabels.map(normalizeLabel));
  const matches = (label: string) => {
    const normalized = normalizeLabel(label);
    if (labels.has(normalized)) {
      return true;
    }
    // This card also includes saved subindustries explicitly named Media - ...
    // or Entertainment - ...; it never selects the whole Communications sector.
    return key === 'media-entertainment' && /^(media|entertainment)\s*[-–—:]\s*\S/.test(normalized);
  };
  const selectedIds = new Set<string>();
  const visit = (nodes: FilterNode[]) => {
    for (const node of nodes) {
      if (node.children?.length) {
        visit(node.children);
      } else if (
        node.id.trim() &&
        Number.isFinite(node.count) &&
        node.count > 0 &&
        matches(node.label)
      ) {
        selectedIds.add(node.id);
      }
    }
  };
  for (const section of options.sections) {
    if (section.id === 'industry') {
      visit(section.options);
    }
  }
  if (selectedIds.size === 0) {
    throw new Error(`${shortcut.label} is not available in the current saved industry filters.`);
  }
  // Pass only IDs supplied by the API, tied to the same saved run.
  return {selectedIds: [...selectedIds], runId: options.runId};
}
export function getTrendingIndustryScrollIndex(
  offsetX: number,
  contentWidth: number,
  viewportWidth: number,
  itemCount: number,
): number {
  const maximumOffset = contentWidth - viewportWidth;
  if (maximumOffset <= 0 || itemCount <= 1) {
    return 0;
  }
  const progress = Math.max(0, Math.min(1, offsetX / maximumOffset));
  return Math.round(progress * (itemCount - 1));
}
import {useCallback, useEffect, useMemo, useState} from 'react';
import {Alert} from 'react-native';
import {sectionIds, type FilterOptions, type FilterSection} from '../domain/stockFilter';
import {stockFilterRepository} from '../infrastructure/HttpStockFilterRepository';
export function useStockFilter(initialSelectedIds: string[] = []) {
  const [data, setData] = useState<FilterOptions | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>(() => [...new Set(initialSelectedIds)]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    stockFilterRepository.options(controller.signal).then((response) => {
      if (!controller.signal.aborted)
        setData(response);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : 'Could not load filters.');
    }).finally(() => {
      if (!controller.signal.aborted)
        setLoading(false);
    });
    return () => controller.abort();
  }, [revision]);
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const unavailable = useMemo(() => {
    if (!data)
      return 0;
    const valid = new Set(data.sections.flatMap(sectionIds));
    return selectedIds.filter((id) => !valid.has(id)).length;
  }, [data, selectedIds]);
  const toggle = useCallback((section: FilterSection, ids: string[]) => {
    const allSelected = ids.every((id) => selected.has(id));
    const remove = new Set(section.mode === 'single' ? sectionIds(section) : ids);
    const next = selectedIds.filter((id) => !remove.has(id));
    if (!allSelected)
      next.push(...ids);
    if (next.length > 500) {
      Alert.alert('Selection limit', 'Please choose up to 500 filter options.');
      return;
    }
    setSelectedIds([...new Set(next)]);
  }, [selected, selectedIds]);
  return {
    data,
    selected,
    selectedIds,
    loading,
    error,
    unavailable,
    toggle,
    clear: () => setSelectedIds([]),
    retry: () => setRevision((value) => value + 1)
  };
}
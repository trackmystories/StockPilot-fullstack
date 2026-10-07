import {useEffect, useMemo, useState} from 'react';
import {HttpMarketStocksRepository} from '../../StockPilot/infrastructure/HttpMarketStocksRepository';
import {GetMarketStocks} from '../../StockPilot/application/GetMarketStocks';
import {listSections} from '../data/smartListAlgorithms';
import type {ListAlgorithm} from '../types/SmartList';

export function useAvailableSmartLists() {
  const [availableAlgorithmIds, setAvailableAlgorithmIds] = useState<Set<ListAlgorithm['id']>>(
    new Set(),
  );

  const [loading, setLoading] = useState(true);

  const getMarketStocks = useMemo(() => {
    const repository = new HttpMarketStocksRepository();

    return new GetMarketStocks(repository);
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);

      const algorithms = listSections.flatMap((section) => section.algorithms);

      const results = await Promise.all(
        algorithms.map(async (algorithm) => {
          try {
            const result = await getMarketStocks.execute(algorithm.id, 0, 1);

            return {
              id: algorithm.id,
              available: result.total > 0,
            };
          } catch (error) {
            console.error(`Could not check Smart List ${algorithm.id}:`, error);

            return {
              id: algorithm.id,
              available: false,
            };
          }
        }),
      );

      if (!active) {
        return;
      }

      const available = new Set<ListAlgorithm['id']>();

      results.forEach((result) => {
        if (result.available) {
          available.add(result.id);
        }
      });

      setAvailableAlgorithmIds(available);
      setLoading(false);
    };

    void load();

    return () => {
      active = false;
    };
  }, [getMarketStocks]);

  return {
    availableAlgorithmIds,
    loading,
  };
}

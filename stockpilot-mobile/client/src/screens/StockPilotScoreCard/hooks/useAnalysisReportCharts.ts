import {useMemo} from 'react';
import {useCompanyReport} from './useCompanyReport';

export function useAnalysisReportCharts(
  symbol: string,
  token: string | null,
) {
  const {data, loading, error} = useCompanyReport(symbol, token);

  const charts = useMemo(
    () =>
      (data?.report?.article?.sections ?? [])
        .flatMap((section) => section.charts)
        .filter(
          (chart) =>
            chart.points.filter((point) => Number.isFinite(point.value))
              .length >= 2,
        ),
    [data],
  );

  return {
    charts,
    loading,
    error,
  };
}
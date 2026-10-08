import {apiClient} from '@common/http/query-client';
import {queryOptions, useQuery} from '@tanstack/react-query';

export interface ProductStatisticsPeriod {
  from: string;
  to: string;
}

export interface ProductStatistics {
  period: ProductStatisticsPeriod;
  kpis: {
    sales_count: number;
    gross_cents: number;
    creator_earnings_cents: number;
    views_count: number;
    conversion_pct: number | null;
  };
  sales_series: Array<{date: string; count: number; gross_cents: number}>;
  views_series: Array<{date: string; count: number}>;
  top_countries: Array<{country: string; sales_count: number; gross_cents: number}>;
  top_referrers: Array<{referrer: string; views_count: number}>;
}

export function productStatisticsOptions(
  queryKey: Array<string | number>,
  endpoint: string,
  params: ProductStatisticsPeriod,
) {
  return queryOptions({
    queryKey: [...queryKey, params.from, params.to],
    queryFn: async () => {
      const response = await apiClient.get<ProductStatistics>(endpoint, {
        params,
      });
      return response.data;
    },
  });
}

export function useProductStatistics(
  queryKey: Array<string | number>,
  endpoint: string,
  params: ProductStatisticsPeriod,
) {
  return useQuery(productStatisticsOptions(queryKey, endpoint, params));
}
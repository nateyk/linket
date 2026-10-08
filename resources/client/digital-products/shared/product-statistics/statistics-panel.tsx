import {Trans} from '@ui/i18n/trans';
import {useState} from 'react';
import {KpiCards} from './kpi-cards';
import {currentMonthPeriod, PeriodPicker} from './period-picker';
import {PerformanceChart} from './performance-chart';
import {useProductStatistics} from './queries';
import {SalesChart} from './sales-chart';
import {TopCountries} from './top-countries';
import {TopReferrers} from './top-referrers';
import {ViewsChart} from './views-chart';

interface StatisticsPanelProps {
  productId: string;
  queryKey: string[];
  endpoint: string;
  currency?: string;
}

export function StatisticsPanel({
  productId,
  queryKey,
  endpoint,
  currency,
}: StatisticsPanelProps) {
  const [period, setPeriod] = useState(() => currentMonthPeriod());
  const {data, isLoading} = useProductStatistics(
    [...queryKey, productId],
    endpoint,
    period,
  );

  if (!data && isLoading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-muted-foreground">
        <Trans message="Loading statistics…" />
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="space-y-4">
      <PeriodPicker from={period.from} to={period.to} onChange={setPeriod} />
      <KpiCards stats={data} currency={currency} />
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <SalesChart stats={data} currency={currency} />
        <ViewsChart stats={data} />
      </div>
      <PerformanceChart stats={data} />
      <div className="grid min-w-0 gap-4 xl:grid-cols-2">
        <TopCountries items={data.top_countries} currency={currency} />
        <TopReferrers items={data.top_referrers} />
      </div>
    </div>
  );
}
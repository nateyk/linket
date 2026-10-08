import {Chart} from '@shadcn/chart/chart';
import {Card} from '@shadcn/card/card';
import {Empty} from '@shadcn/empty/empty';
import {Trans} from '@ui/i18n/trans';
import {useSelectedLocale} from '@ui/i18n/selected-locale';
import {ChartNoAxesCombinedIcon} from 'lucide-react';
import {useMemo} from 'react';
import {Area, AreaChart, CartesianGrid, XAxis, YAxis} from 'recharts';
import {ProductStatistics} from './queries';

interface PerformanceChartProps {
  stats: ProductStatistics;
}

function formatDate(localeCode: string, date: string) {
  return new Intl.DateTimeFormat(localeCode, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`));
}

function conversionFor(count: number, views: number): number {
  return views > 0 ? Math.round((count / views) * 1000) / 10 : 0;
}

export function PerformanceChart({stats}: PerformanceChartProps) {
  const {localeCode} = useSelectedLocale();
  const chartData = useMemo(
    () =>
      stats.sales_series.map((item, index) => ({
        date: item.date,
        conversion: conversionFor(item.count, stats.views_series[index]?.count ?? 0),
      })),
    [stats.sales_series, stats.views_series],
  );
  const hasActivity =
    stats.sales_series.some(item => item.count > 0) ||
    stats.views_series.some(item => item.count > 0);

  return (
    <Card size="sm" className="min-w-0">
      <Card.Header>
        <Card.Title>
          <Trans message="Performance" />
        </Card.Title>
      </Card.Header>
      <Card.Content className="relative h-64 min-w-0 md:h-72">
        {hasActivity ? (
          <Chart.Container className="size-full">
            <AreaChart data={chartData} margin={{left: 0, right: 8}}>
              <defs>
                <linearGradient id="productConversion" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-3)" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="var(--chart-3)" stopOpacity={0.03} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                minTickGap={32}
                tickFormatter={date => formatDate(localeCode, String(date))}
              />
              <YAxis hide />
              <Chart.Tooltip
                content={
                  <Chart.TooltipContent
                    itemName="Conversion"
                    labelFormatter={label =>
                      formatDate(localeCode, String(label))
                    }
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="conversion"
                name="Conversion"
                stroke="var(--chart-3)"
                fill="url(#productConversion)"
                strokeWidth={2}
                dot={false}
                activeDot={{r: 4}}
                unit="%"
              />
            </AreaChart>
          </Chart.Container>
        ) : (
          <Empty className="h-full border-0 p-6">
            <Empty.Header>
              <Empty.Media variant="icon">
                <ChartNoAxesCombinedIcon />
              </Empty.Media>
              <Empty.Title>
                <Trans message="No performance data in this period" />
              </Empty.Title>
              <Empty.Description>
                <Trans message="Daily conversion from views to sales appears here." />
              </Empty.Description>
            </Empty.Header>
          </Empty>
        )}
      </Card.Content>
    </Card>
  );
}
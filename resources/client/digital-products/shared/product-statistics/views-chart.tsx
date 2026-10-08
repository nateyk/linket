import {Chart} from '@shadcn/chart/chart';
import {Card} from '@shadcn/card/card';
import {Empty} from '@shadcn/empty/empty';
import {Trans} from '@ui/i18n/trans';
import {useSelectedLocale} from '@ui/i18n/selected-locale';
import {ChartNoAxesCombinedIcon} from 'lucide-react';
import {useMemo} from 'react';
import {Area, AreaChart, CartesianGrid, XAxis, YAxis} from 'recharts';
import {ProductStatistics} from './queries';

interface ViewsChartProps {
  stats: ProductStatistics;
}

function formatDate(localeCode: string, date: string) {
  return new Intl.DateTimeFormat(localeCode, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`));
}

export function ViewsChart({stats}: ViewsChartProps) {
  const {localeCode} = useSelectedLocale();
  const chartData = useMemo(() => stats.views_series, [stats.views_series]);
  const hasActivity = chartData.some(item => item.count > 0);

  return (
    <Card size="sm" className="min-w-0">
      <Card.Header>
        <Card.Title>
          <Trans message="Views" />
        </Card.Title>
      </Card.Header>
      <Card.Content className="relative h-64 min-w-0 md:h-72">
        {hasActivity ? (
          <Chart.Container className="size-full">
            <AreaChart data={chartData} margin={{left: 0, right: 8}}>
              <defs>
                <linearGradient id="productViews" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.32} />
                  <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.03} />
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
                    labelFormatter={label =>
                      formatDate(localeCode, String(label))
                    }
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="count"
                name="Views"
                stroke="var(--chart-2)"
                fill="url(#productViews)"
                strokeWidth={2}
                dot={false}
                activeDot={{r: 4}}
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
                <Trans message="No views in this period" />
              </Empty.Title>
              <Empty.Description>
                <Trans message="Product page views will appear here." />
              </Empty.Description>
            </Empty.Header>
          </Empty>
        )}
      </Card.Content>
    </Card>
  );
}
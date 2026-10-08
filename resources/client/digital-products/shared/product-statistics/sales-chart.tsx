import {Chart} from '@shadcn/chart/chart';
import {Card} from '@shadcn/card/card';
import {Empty} from '@shadcn/empty/empty';
import {Trans} from '@ui/i18n/trans';
import {useSelectedLocale} from '@ui/i18n/selected-locale';
import {ChartNoAxesCombinedIcon} from 'lucide-react';
import {useMemo} from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
} from 'recharts';
import {ProductStatistics} from './queries';

interface SalesChartProps {
  stats: ProductStatistics;
  currency?: string;
}

function formatDate(localeCode: string, date: string) {
  return new Intl.DateTimeFormat(localeCode, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(`${date}T00:00:00Z`));
}

export function SalesChart({stats, currency = 'ETB'}: SalesChartProps) {
  const {localeCode} = useSelectedLocale();
  const chartData = useMemo(
    () =>
      stats.sales_series.map(item => ({
        ...item,
        gross: item.gross_cents / 100,
      })),
    [stats.sales_series],
  );
  const hasActivity = chartData.some(
    item => item.count > 0 || item.gross_cents > 0,
  );

  return (
    <Card size="sm" className="min-w-0">
      <Card.Header>
        <Card.Title>
          <Trans message="Sales" />
        </Card.Title>
      </Card.Header>
      <Card.Content className="relative h-64 min-w-0 md:h-72">
        {hasActivity ? (
          <Chart.Container className="size-full">
            <ComposedChart data={chartData} margin={{left: 0, right: 8}}>
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
              <Bar
                dataKey="count"
                name="Sales"
                radius={[4, 4, 0, 0]}
                fill="var(--chart-1)"
                maxBarSize={32}
              />
              <Line
                type="monotone"
                dataKey="gross"
                name={`Gross (${currency})`}
                stroke="var(--chart-2)"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </Chart.Container>
        ) : (
          <Empty className="h-full border-0 p-6">
            <Empty.Header>
              <Empty.Media variant="icon">
                <ChartNoAxesCombinedIcon />
              </Empty.Media>
              <Empty.Title>
                <Trans message="No sales in this period" />
              </Empty.Title>
              <Empty.Description>
                <Trans message="Sales made each day will appear here." />
              </Empty.Description>
            </Empty.Header>
          </Empty>
        )}
      </Card.Content>
    </Card>
  );
}
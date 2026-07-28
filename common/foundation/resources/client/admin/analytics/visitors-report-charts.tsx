import {GenerateVisitorsReport200Data} from '@app/gen/schemas/generate-visitors-report200-data';
import {GeoChart} from '@common/admin/analytics/geo-chart/geo-chart';
import {Card} from '@shadcn/card/card';
import {Chart} from '@shadcn/chart/chart';
import {
  generateTimeChartLabel,
  generateTimeChartTooltip,
  useChartDataWithColors,
} from '@shadcn/chart/chart-utils';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {useSelectedLocale} from '@ui/i18n/selected-locale';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {useMemo} from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Pie,
  PieChart,
  PieSectorShapeProps,
  Sector,
  XAxis,
  YAxis,
} from 'recharts';

interface AdminReportChartsProps {
  report?: GenerateVisitorsReport200Data;
  isLoading: boolean;
}
export function VisitorsReportCharts({
  report,
  isLoading,
}: AdminReportChartsProps) {
  const {trans} = useTrans();
  return (
    <div className="chart-grid">
      <PageViewsChart report={report?.page_views} isLoading={isLoading} />
      <TopDevicesChart report={report?.devices} isLoading={isLoading} />
      <GeoChart
        className="col-span-7"
        isLoading={isLoading}
        data={report?.locations?.data}
        datasetLabel={trans({message: 'Visitors'})}
      />
      <TopBrowsersChart report={report?.browsers} isLoading={isLoading} />
    </div>
  );
}

function PageViewsChart({
  report,
  isLoading,
}: {
  report?: GenerateVisitorsReport200Data['page_views'];
  isLoading: boolean;
}) {
  const {localeCode} = useSelectedLocale();
  return (
    <Card size="sm" className="col-span-9 row-span-11">
      <Card.Header>
        <Card.Title>
          <Trans message="Page views" />
        </Card.Title>
        <Card.Description>
          <Trans
            message=":count total views"
            values={{count: <FormattedNumber value={report?.total || 0} />}}
          />
        </Card.Description>
      </Card.Header>
      <Card.Content className="relative flex-1">
        <Chart.Container className="h-full w-full">
          <AreaChart data={report?.data} margin={{left: 0}}>
            <linearGradient id="fillPageViews" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
              <stop
                offset="95%"
                stopColor="var(--chart-1)"
                stopOpacity={0.05}
              />
            </linearGradient>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              interval="preserveStartEnd"
              tickFormatter={(value, index) => {
                const dataItem = report?.data[index];
                if (!dataItem) return value;
                return generateTimeChartLabel({
                  locale: localeCode,
                  granularity: report?.granularity,
                  dataItem,
                });
              }}
            />
            <YAxis
              dataKey="value"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              domain={[0, 'dataMax']}
              hide
            />
            <Chart.Tooltip
              content={
                <Chart.TooltipContent
                  itemName={<Trans message="Page views" />}
                  labelFormatter={(_, payload) =>
                    generateTimeChartTooltip({
                      locale: localeCode,
                      granularity: report?.granularity,
                      dataItem: payload?.[0]?.payload,
                    })
                  }
                />
              }
            />
            <Area
              type="monotone"
              dataKey="value"
              fill="url(#fillPageViews)"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={false}
            />
          </AreaChart>
        </Chart.Container>
        {isLoading && <Chart.LoadingIndicator />}
        {!isLoading && !report?.data?.length && <Chart.NoDataIndicator />}
      </Card.Content>
    </Card>
  );
}

function TopDevicesChart({
  report,
  isLoading,
}: {
  report?: GenerateVisitorsReport200Data['devices'];
  isLoading: boolean;
}) {
  const dataWithColors = useChartDataWithColors(report?.data);
  const biggestSectorIndex = useMemo(
    () =>
      dataWithColors.reduce(
        (biggestIndex: number, item: any, index, items: any[]) => {
          if (biggestIndex === -1) return index;
          return item.value > items[biggestIndex].value ? index : biggestIndex;
        },
        -1,
      ),
    [dataWithColors],
  );
  return (
    <Card size="sm" className="col-span-3 row-span-11">
      <Card.Header>
        <Card.Title>
          <Trans message="Top devices" />
        </Card.Title>
      </Card.Header>
      <Card.Content className="relative flex-1">
        <Chart.Container className="h-full w-full">
          <PieChart>
            <Chart.Tooltip cursor={false} content={<Chart.TooltipContent />} />
            <Pie
              data={dataWithColors}
              dataKey="value"
              nameKey="label"
              innerRadius={60}
              strokeWidth={5}
              shape={({
                index,
                outerRadius = 0,
                ...props
              }: PieSectorShapeProps) =>
                index === biggestSectorIndex ? (
                  <Sector {...props} outerRadius={outerRadius + 10} />
                ) : (
                  <Sector {...props} outerRadius={outerRadius} />
                )
              }
            >
              <LabelList
                dataKey="label"
                className="fill-background"
                stroke="none"
                fontSize={12}
              />
            </Pie>
          </PieChart>
        </Chart.Container>
        {isLoading && <Chart.LoadingIndicator />}
        {!isLoading && !report?.data?.length && <Chart.NoDataIndicator />}
      </Card.Content>
    </Card>
  );
}

function TopBrowsersChart({
  report,
  isLoading,
}: {
  report?: GenerateVisitorsReport200Data['browsers'];
  isLoading: boolean;
}) {
  const dataWithColors = useChartDataWithColors(report?.data);
  return (
    <Card size="sm" className="col-span-5 row-span-11">
      <Card.Header>
        <Card.Title>
          <Trans message="Top browsers" />
        </Card.Title>
      </Card.Header>
      <Card.Content className="relative flex-1">
        <Chart.Container className="h-full w-full">
          <BarChart accessibilityLayer layout="vertical" data={dataWithColors}>
            <YAxis
              dataKey="label"
              type="category"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <XAxis dataKey="value" type="number" hide />
            <Chart.Tooltip
              content={
                <Chart.TooltipContent
                  itemName={<Trans message="Page views" />}
                />
              }
            />
            <Bar dataKey="value" radius={5} />
          </BarChart>
        </Chart.Container>
        {isLoading && <Chart.LoadingIndicator />}
        {!isLoading && !report?.data?.length && <Chart.NoDataIndicator />}
      </Card.Content>
    </Card>
  );
}

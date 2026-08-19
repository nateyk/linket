import {trackedEventsReportOptions} from '@app/dashboard/reports/tracked-events-queries';
import {GenerateTrackedEventsReport200Data} from '@app/gen/schemas/generate-tracked-events-report200-data';
import {GeoChart} from '@common/admin/analytics/geo-chart/geo-chart';
import {ReportDateSelector} from '@common/admin/analytics/report-date-selector';
import {AddFilterPopover} from '@common/datatable/filters/add-filter-popover';
import {BackendFilter} from '@common/datatable/filters/backend-filter';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {RemoteFavicon} from '@common/ui/other/remote-favicon';
import {Badge} from '@shadcn/badge/badge';
import {Card} from '@shadcn/card/card';
import {Chart} from '@shadcn/chart/chart';
import {
  generateTimeChartLabel,
  generateTimeChartTooltip,
  useChartDataWithColors,
} from '@shadcn/chart/chart-utils';
import {keepPreviousData, useQuery} from '@tanstack/react-query';
import {DateRangeValue} from '@ui/forms/input-field/date/date-range-picker/date-range-value';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {useSelectedLocale} from '@ui/i18n/selected-locale';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {removeProtocol} from '@ui/utils/urls/remove-protocol';
import {useCallback, useMemo, useRef, useState} from 'react';
import {useSearchParams} from 'react-router';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  PieSectorShapeProps,
  Sector,
  XAxis,
  YAxis,
} from 'recharts';

interface TrackedEventsInsightsProps {
  dateRange: DateRangeValue;
  allFilters: BackendFilter[];
  forcedFilters?: Record<string, unknown>;
}
export function TrackedEventsInsights(props: TrackedEventsInsightsProps) {
  return (
    <div className="grid min-w-0 grid-cols-1 gap-5 xl:grid-cols-12">
      <EventsOverTimeChart {...props} />
      <TopDevicesChart {...props} />
      <ReferrerChart {...props} />
      <GeoChartWithCities {...props} />
      <TopBrowsersChart {...props} />
      <TopPlatformsChart {...props} />
    </div>
  );
}

function EventsOverTimeChart(props: TrackedEventsInsightsProps) {
  const {localeCode} = useSelectedLocale();
  const {report, contentRef, isLoading} = useAsyncChart({
    ...props,
    metric: 'events',
  });

  const isEmpty = !isLoading && !report?.data?.length;

  return (
    <Card size="sm" className="min-w-0 xl:col-span-8 2xl:col-span-9">
      <Card.Header>
        <Card.Title>
          <Trans message="Engagements over time" />
        </Card.Title>
        <Card.Description>
          <Trans
            message=":count total engagements"
            values={{count: <FormattedNumber value={report?.total || 0} />}}
          />
        </Card.Description>
      </Card.Header>
      <Card.Content ref={contentRef} className="relative h-80 min-w-0">
        {!isEmpty && (
          <Chart.Container className="size-full">
            <AreaChart data={report?.data} margin={{left: 0, right: 8}}>
              <linearGradient id="fillEngagements" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.35}
                />
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
                    itemName={<Trans message="Engagements" />}
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
                fill="url(#fillEngagements)"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          </Chart.Container>
        )}
        {isLoading && <Chart.LoadingIndicator />}
        {isEmpty && <Chart.NoDataIndicator />}
      </Card.Content>
    </Card>
  );
}

function TopDevicesChart(props: TrackedEventsInsightsProps) {
  const {report, contentRef, isLoading} = useAsyncChart({
    ...props,
    metric: 'devices',
  });
  const dataWithColors = useChartDataWithColors(report?.data);
  const biggestSectorIndex = useMemo(
    () =>
      dataWithColors.reduce((biggestIndex, item, index, items) => {
        if (biggestIndex === -1) return index;
        return item.value > items[biggestIndex]!.value ? index : biggestIndex;
      }, -1),
    [dataWithColors],
  );
  return (
    <Card size="sm" className="min-w-0 xl:col-span-4 2xl:col-span-3">
      <Card.Header>
        <Card.Title>
          <Trans message="Top devices" />
        </Card.Title>
      </Card.Header>
      <Card.Content
        ref={contentRef}
        className="relative flex min-h-80 min-w-0 flex-col gap-4"
      >
        <Chart.Container className="mx-auto h-56 w-full max-w-72">
          <PieChart>
            <Chart.Tooltip cursor={false} content={<Chart.TooltipContent />} />
            <Pie
              data={dataWithColors}
              dataKey="value"
              nameKey="label"
              innerRadius={54}
              outerRadius={78}
              strokeWidth={4}
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
            />
          </PieChart>
        </Chart.Container>
        {!!dataWithColors.length && (
          <div className="grid gap-2">
            {dataWithColors.map(item => (
              <div
                key={item.label}
                className="flex min-w-0 items-center gap-2 text-sm"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{backgroundColor: item.fill}}
                />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {item.label}
                </span>
                <span className="font-medium tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
        )}
        {isLoading && <Chart.LoadingIndicator />}
        {!isLoading && !report?.data?.length && <Chart.NoDataIndicator />}
      </Card.Content>
    </Card>
  );
}

function TopBrowsersChart(props: TrackedEventsInsightsProps) {
  const {report, contentRef, isLoading} = useAsyncChart({
    ...props,
    metric: 'browsers',
  });
  const dataWithColors = useChartDataWithColors(report?.data);
  return (
    <Card size="sm" className="min-w-0 xl:col-span-6">
      <Card.Header>
        <Card.Title>
          <Trans message="Top browsers" />
        </Card.Title>
      </Card.Header>
      <Card.Content ref={contentRef} className="relative h-72 min-w-0">
        <Chart.Container className="h-full w-full">
          <BarChart
            accessibilityLayer
            layout="vertical"
            data={dataWithColors}
            margin={{right: 12}}
          >
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
                  itemName={<Trans message="Engagements" />}
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

function TopPlatformsChart(props: TrackedEventsInsightsProps) {
  const {report, contentRef, isLoading} = useAsyncChart({
    ...props,
    metric: 'platforms',
  });
  const dataWithColors = useChartDataWithColors(report?.data);
  return (
    <Card size="sm" className="min-w-0 xl:col-span-6">
      <Card.Header>
        <Card.Title>
          <Trans message="Top platforms" />
        </Card.Title>
      </Card.Header>
      <Card.Content ref={contentRef} className="relative h-72 min-w-0">
        <Chart.Container className="h-full w-full">
          <BarChart
            accessibilityLayer
            layout="vertical"
            data={dataWithColors}
            margin={{left: 14, right: 12}}
          >
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
                  itemName={<Trans message="Engagements" />}
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

function ReferrerChart(props: TrackedEventsInsightsProps) {
  const {report, contentRef, isLoading} = useAsyncChart({
    ...props,
    metric: 'referrers',
  });

  return (
    <Card size="sm" className="min-w-0 xl:col-span-6">
      <Card.Header>
        <Card.Title>
          <Trans message="Referrers" />
        </Card.Title>
      </Card.Header>
      <Card.Content
        ref={contentRef}
        className="compact-scrollbar relative min-h-80 min-w-0 overflow-y-auto overscroll-contain"
      >
        {report?.data?.map((dataItem, index) => (
          <div
            key={dataItem.label || index}
            className="mb-5 flex items-center justify-between gap-6 text-sm"
          >
            {dataItem.label ? (
              <div className="flex items-center gap-2">
                <RemoteFavicon url={dataItem.label} />
                <a
                  className={cn(
                    'truncate overflow-hidden lowercase underline-offset-2 hover:underline',
                  )}
                  href={dataItem.label}
                  target="_blank"
                  rel="noreferrer"
                >
                  {removeProtocol(dataItem.label)}
                </a>
              </div>
            ) : (
              <Trans message="Direct, Email, SMS" />
            )}
            <Badge>{dataItem.value}</Badge>
          </div>
        ))}
        {isLoading && <Chart.LoadingIndicator />}
        {!isLoading && !report?.data?.length && <Chart.NoDataIndicator />}
      </Card.Content>
    </Card>
  );
}

type TrackedEventsInsightsDateAndFilterButtonsProps = {
  dateRange: DateRangeValue;
  setDateRange: (dateRange: DateRangeValue) => void;
  filters: BackendFilter[];
};
export function TrackedEventsInsightsDateAndFilterButtons({
  dateRange,
  setDateRange,
  filters,
}: TrackedEventsInsightsDateAndFilterButtonsProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <ReportDateSelector
        value={dateRange}
        onChange={setDateRange}
        compactOnMobile={false}
      />
      <FilterList filters={filters} />
      <AddFilterPopover filters={filters} />
    </div>
  );
}

function GeoChartWithCities(props: TrackedEventsInsightsProps) {
  const {trans} = useTrans();
  const [params, setParams] = useSearchParams();
  const selectedCountry = params.get('country') || undefined;

  const handleCountrySelected = useCallback(
    (country?: string) => {
      setParams(prev => {
        if (country) {
          prev.set('country', country);
        } else {
          prev.delete('country');
        }
        return prev;
      });
    },
    [setParams],
  );

  const {report, contentRef, isLoading} = useAsyncChart({
    ...props,
    metric: selectedCountry ? 'cities' : 'countries',
    country: selectedCountry,
  });

  return (
    <GeoChart
      onCountrySelected={handleCountrySelected}
      country={selectedCountry}
      className="min-w-0 xl:col-span-6"
      datasetLabel={trans({message: 'Engagements'})}
      data={report?.data as any}
      isLoading={isLoading}
      contentRef={contentRef}
    />
  );
}

type Reportmetric = keyof GenerateTrackedEventsReport200Data;
type AsyncChartProps<Metric extends Reportmetric> =
  TrackedEventsInsightsProps & {
    metric: Metric;
    country?: string;
  };

function useAsyncChart<Metric extends Reportmetric>({
  metric,
  allFilters,
  forcedFilters,
  dateRange,
  country,
}: AsyncChartProps<Metric>) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [searchParams] = useSearchParams();

  const params: Record<string, string> = {
    metric,
    ...forcedFilters,
    start_date: dateRange.start.toAbsoluteString(),
    end_date: dateRange.end.toAbsoluteString(),
    timezone: dateRange.start.timeZone,
  };

  if (country) {
    params.country = country;
  }

  allFilters?.forEach(filter => {
    const value = searchParams.get(filter.key);
    if (value) {
      params[filter.key] = value;
    }
  });

  const query = useQuery({
    ...trackedEventsReportOptions(params),
    enabled: isEnabled,
    staleTime: Infinity,
    placeholderData: keepPreviousData,
  });
  const observerRef = useRef<IntersectionObserver>(null);

  const contentRef = useCallback((el: HTMLDivElement | null) => {
    if (el) {
      const observer = new IntersectionObserver(
        ([e]) => {
          if (e?.isIntersecting) {
            setIsEnabled(true);
            observerRef.current?.disconnect();
            observerRef.current = null;
          }
        },
        {threshold: 0.1}, // if only header is visible, don't load
      );
      observerRef.current = observer;
      observer.observe(el);
    } else if (observerRef.current) {
      observerRef.current?.disconnect();
    }
  }, []);

  return {
    report: query.data?.data?.[metric],
    isLoading: query.isLoading,
    contentRef,
  };
}

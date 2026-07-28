import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Chart} from '@shadcn/chart/chart';
import {Popover} from '@shadcn/popover/popover';
import {FormattedCountryName} from '@ui/i18n/formatted-country-name';
import {Trans} from '@ui/i18n/trans';
import {ArrowBackIcon} from '@ui/icons/material/ArrowBack';
import {cn} from '@ui/utils/cn';
import clsx from 'clsx';
import {CircleQuestionMarkIcon} from 'lucide-react';
import {Ref, useMemo, useRef} from 'react';
import {useGoogleGeoChart} from './use-google-geo-chart';

type DataItem = {
  label?: string;
  value: number;
  date?: string;
  endDate?: string;
  percentage: number;
  code: string;
};

interface GeoChartData {
  data?: DataItem[];
  onCountrySelected?: (countryCode: string | undefined) => void;
  country?: string;
  datasetLabel: string;
  contentRef?: Ref<HTMLDivElement | null>;
  isLoading?: boolean;
  className?: string;
}
export function GeoChart({
  data: metricData,
  isLoading,
  onCountrySelected,
  country,
  className,
  datasetLabel,
  contentRef,
}: GeoChartData) {
  const placeholderRef = useRef<HTMLDivElement>(null);
  const regionInteractivity = !!onCountrySelected;

  // memo data to avoid redrawing chart on rerender
  const data = useMemo(() => {
    return metricData || [];
  }, [metricData]);

  useGoogleGeoChart({
    placeholderRef,
    data,
    country,
    onCountrySelected,
    datasetLabel,
  });

  const isEmpty = !isLoading && !data?.length;

  return (
    <Card size="sm" className={cn('col-span-6 row-span-11', className)}>
      <Card.Header>
        <Card.Title>
          <Trans message="Top Locations" />
          {country ? (
            <span className="pl-1">
              ({<FormattedCountryName code={country} />})
            </span>
          ) : null}
          {regionInteractivity && <InfoTrigger />}
        </Card.Title>
      </Card.Header>
      <Card.Content
        ref={contentRef}
        className="compact-scrollbar relative flex-1 overflow-auto overscroll-contain"
      >
        {!isEmpty && (
          <div className="flex gap-6">
            <div ref={placeholderRef} className="min-h-85 w-120 flex-auto" />
            <div className="w-42.5">
              <div className="max-h-85 w-full flex-initial text-sm">
                {data.map(location => (
                  <div
                    key={location.label}
                    className={clsx(
                      'mb-1 flex items-center gap-1',
                      regionInteractivity && 'cursor-pointer hover:underline',
                    )}
                    role={regionInteractivity ? 'button' : undefined}
                    onClick={() => {
                      onCountrySelected?.(location.code);
                    }}
                  >
                    <div className="max-w-27.5 overflow-hidden text-ellipsis whitespace-nowrap">
                      {location.label}
                    </div>
                    <div>({location.percentage})%</div>
                  </div>
                ))}
              </div>
              {country && (
                <Button
                  variant="outline"
                  size="xs"
                  className="mt-3.5"
                  onClick={() => {
                    onCountrySelected?.(undefined);
                  }}
                >
                  <ArrowBackIcon />
                  <Trans message="Back to countries" />
                </Button>
              )}
            </div>
          </div>
        )}
        {isLoading && <Chart.LoadingIndicator />}
        {isEmpty && <Chart.NoDataIndicator />}
      </Card.Content>
    </Card>
  );
}

function InfoTrigger() {
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
          />
        }
      >
        <CircleQuestionMarkIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="text-center text-pretty">
          <Trans message="Click on a country inside the map or country list to zoom in and see city data for that country." />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

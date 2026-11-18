import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Chart} from '@shadcn/chart/chart';
import {Popover} from '@shadcn/popover/popover';
import {FormattedCountryName} from '@ui/i18n/formatted-country-name';
import {Trans} from '@ui/i18n/trans';
import {message} from '@ui/i18n/message';
import {useTrans} from '@ui/i18n/use-trans';
import {ArrowBackIcon} from '@ui/icons/material/ArrowBack';
import {cn} from '@ui/utils/cn';
import {CircleQuestionMarkIcon, MapPinOffIcon} from 'lucide-react';
import {Ref, useMemo, useRef} from 'react';
import {useGoogleGeoChart} from './use-google-geo-chart';

type DataItem = {
  label?: string;
  value: number;
  percentage: number;
  code?: string;
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
  const canSelectCountry = !!onCountrySelected && !country;
  const data = metricData ?? [];

  const mapData = useMemo(
    () =>
      data.filter(location =>
        country
          ? !!location.label &&
            !['unknown', 'unknown location'].includes(
              location.label.trim().toLowerCase(),
            )
          : !!location.code && /^[a-z]{2}$/i.test(location.code),
      ),
    [data, country],
  );

  useGoogleGeoChart({
    placeholderRef,
    data: mapData,
    enabled: !isLoading && mapData.length > 0,
    country,
    onCountrySelected: canSelectCountry ? onCountrySelected : undefined,
    datasetLabel,
  });

  const isEmpty = !isLoading && data.length === 0;
  const hasMap = mapData.length > 0;
  const unknownCount = data
    .filter(item => !mapData.includes(item))
    .reduce((sum, item) => sum + item.value, 0);

  return (
    <Card size="sm" className={cn('min-w-0', className)}>
      <Card.Header>
        <Card.Title>
          <Trans message="Top Locations" />
          {country && (
            <span className="pl-1">
              ({<FormattedCountryName code={country} />})
            </span>
          )}
          {canSelectCountry && <InfoTrigger />}
        </Card.Title>
        <Card.Description>
          <Trans message="Engagements by location" />
        </Card.Description>
      </Card.Header>
      <Card.Content
        ref={contentRef}
        className="relative min-w-0 overflow-hidden"
      >
        {!isLoading && data.length > 0 && (
          <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,0.43fr)] lg:gap-6">
            {hasMap ? (
              <div className="relative aspect-[16/10] w-full min-w-0 overflow-hidden rounded-lg bg-muted/20 sm:aspect-[16/9] lg:aspect-auto lg:min-h-72">
                <div
                  ref={placeholderRef}
                  role="img"
                  aria-label={country ? 'City locations map' : 'Country locations map'}
                  className="absolute inset-0 size-full"
                />
              </div>
            ) : (
              <div className="flex min-h-44 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-5 py-8 text-center lg:min-h-72">
                <MapPinOffIcon className="size-6 text-muted-foreground" aria-hidden="true" />
                <p className="text-sm font-medium">
                  <Trans message="Location data unavailable" />
                </p>
                <p className="max-w-xs text-xs leading-5 text-muted-foreground">
                  <Trans message="We could not identify a country for these visits. A location will appear when it can be determined." />
                </p>
              </div>
            )}

            <div className="flex min-w-0 flex-col gap-3">
              <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
                <span><Trans message="Location" /></span>
                <span>{datasetLabel}</span>
              </div>
              <ol className="compact-scrollbar flex min-w-0 flex-col gap-3 overflow-y-auto lg:max-h-76">
                {data.map((location, index) => {
                  const selectable = canSelectCountry &&
                    !!location.code &&
                    /^[a-z]{2}$/i.test(location.code);
                  const row = (
                    <>
                      <div className="flex min-w-0 items-center justify-between gap-3 text-sm">
                        <span className="min-w-0 truncate font-medium">
                          {location.label || <Trans message="Unknown location" />}
                        </span>
                        <span className="shrink-0 tabular-nums text-muted-foreground">
                          {location.value.toLocaleString()} · {location.percentage}%
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{width: `${Math.min(100, Math.max(0, location.percentage))}%`}}
                        />
                      </div>
                    </>
                  );

                  return (
                    <li key={location.code || location.label || index} className="min-w-0">
                      {selectable ? (
                        <button
                          type="button"
                          className="w-full rounded-sm text-start outline-offset-2 hover:text-primary focus-visible:outline-2 focus-visible:outline-foreground"
                          onClick={() => onCountrySelected?.(location.code)}
                        >
                          {row}
                        </button>
                      ) : (
                        <div>{row}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
              {unknownCount > 0 && hasMap && (
                <p className="text-xs leading-5 text-muted-foreground">
                  <Trans message="Visits without a known country are included in the list but not shown on the map." />
                </p>
              )}
              {country && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-auto w-fit"
                  onClick={() => onCountrySelected?.(undefined)}
                >
                  <ArrowBackIcon />
                  <Trans message="Back to countries" />
                </Button>
              )}
            </div>
          </div>
        )}
        {isLoading && (
          <div className="relative h-72">
            <Chart.LoadingIndicator />
          </div>
        )}
        {isEmpty && (
          <div className="relative h-72">
            <Chart.NoDataIndicator />
          </div>
        )}
      </Card.Content>
    </Card>
  );
}

function InfoTrigger() {
  const {trans} = useTrans();
  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label={trans(message('About this map'))}
          />
        }
      >
        <CircleQuestionMarkIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content className="text-center text-pretty">
          <Trans message="Select a country on the map or list to see its city data. Locations are estimated from visitor IP addresses." />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

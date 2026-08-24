import {useTrackedEventsFilters} from '@app/dashboard/reports/tracked-events-filters';
import {
  TrackedEventsInsights,
  TrackedEventsInsightsDateAndFilterButtons,
} from '@app/dashboard/reports/tracked-events-insights';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {DateRangeValue} from '@ui/forms/input-field/date/date-range-picker/date-range-value';
import {DateRangePresets} from '@ui/forms/input-field/date/date-range-picker/dialog/date-range-presets';
import {Trans} from '@ui/i18n/trans';
import {useMemo, useState} from 'react';

export function Component() {
  const {storeId} = useRequiredParams(['storeId']);
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    return DateRangePresets[2]!.getRangeValue();
  });
  const filters = useTrackedEventsFilters({isScopedToLinkeable: true});

  const forcedFilters = useMemo(
    () => ({
      biolink_id: storeId,
      event_type: 'click',
    }),
    [storeId],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">
          <Trans message="Bio Link insights" />
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          <Trans message="Understand how visitors engage with this Bio Link page." />
        </p>
      </div>
      <TrackedEventsInsightsDateAndFilterButtons
        dateRange={dateRange}
        setDateRange={setDateRange}
        filters={filters}
      />
      <TrackedEventsInsights
        dateRange={dateRange}
        forcedFilters={forcedFilters}
        allFilters={filters}
      />
    </div>
  );
}

import {useTrackedEventsFilters} from '@app/dashboard/reports/tracked-events-filters';
import {
  TrackedEventsInsights,
  TrackedEventsInsightsDateAndFilterButtons,
} from '@app/dashboard/reports/tracked-events-insights';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {DateRangeValue} from '@ui/forms/input-field/date/date-range-picker/date-range-value';
import {DateRangePresets} from '@ui/forms/input-field/date/date-range-picker/dialog/date-range-presets';
import {useMemo, useState} from 'react';

export function Component() {
  const {biolinkId} = useRequiredParams(['biolinkId']);
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    return DateRangePresets[2]!.getRangeValue();
  });
  const filters = useTrackedEventsFilters({isScopedToLinkeable: true});

  const forcedFilters = useMemo(
    () => ({
      biolink_id: biolinkId,
      event_type: 'click',
    }),
    [biolinkId],
  );

  return (
    <div className="flex flex-col gap-6">
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

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
  const {qrCodeId} = useRequiredParams(['qrCodeId']);
  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    DateRangePresets[2]!.getRangeValue(),
  );
  const filters = useTrackedEventsFilters({isScopedToLinkeable: true});

  const forcedFilters = useMemo(
    () => ({
      qr_code_id: qrCodeId,
      event_type: 'scane',
    }),
    [qrCodeId],
  );

  return (
    <>
      <TrackedEventsInsightsDateAndFilterButtons
        dateRange={dateRange}
        setDateRange={setDateRange}
        filters={filters}
      />
      <TrackedEventsInsights
        dateRange={dateRange}
        allFilters={filters}
        forcedFilters={forcedFilters}
      />
    </>
  );
}

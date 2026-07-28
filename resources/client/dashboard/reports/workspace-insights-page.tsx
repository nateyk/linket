import {useTrackedEventsFilters} from '@app/dashboard/reports/tracked-events-filters';
import {TrackedEventsInsights} from '@app/dashboard/reports/tracked-events-insights';
import {DateRangeValue} from '@ui/forms/input-field/date/date-range-picker/date-range-value';
import {useOutletContext} from 'react-router';

export function Component() {
  const dateRange = useOutletContext<DateRangeValue>();
  const filters = useTrackedEventsFilters();

  return <TrackedEventsInsights dateRange={dateRange} allFilters={filters} />;
}

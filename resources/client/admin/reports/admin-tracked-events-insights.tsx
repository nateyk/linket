import {AdminReportOutletContext} from '@app/admin/reports/admin-insights-page-layout';
import {useTrackedEventsFilters} from '@app/dashboard/reports/tracked-events-filters';
import {TrackedEventsInsights} from '@app/dashboard/reports/tracked-events-insights';
import {useMemo} from 'react';
import {useOutletContext} from 'react-router';

export function Component() {
  const {dateRange} = useOutletContext<AdminReportOutletContext>();

  const filters = useTrackedEventsFilters();

  const forcedFilters = useMemo(
    () => ({
      workspace_id: 'all',
    }),
    [],
  );

  return (
    <TrackedEventsInsights
      dateRange={dateRange}
      forcedFilters={forcedFilters}
      allFilters={filters}
    />
  );
}

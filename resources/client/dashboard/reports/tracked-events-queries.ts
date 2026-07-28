import {DatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {
  generateTrackedEventsReport,
  listTrackedEvents,
} from '@app/gen/analytics';
import {queryOptions} from '@tanstack/react-query';
import {FirstParam} from '@ui/utils/ts/extract-params';

export const baseTrackedEventsKey = ['tracked-events'];

export const listTrackedEventsOptions = (
  routeType: DatatableRouteType,
  search?: FirstParam<typeof listTrackedEvents>,
) => {
  const params = {...search};
  if (routeType === 'admin') {
    params.workspace_id = 'all';
  }
  return queryOptions({
    queryKey: [...baseTrackedEventsKey, params],
    queryFn: () => listTrackedEvents(params),
  });
};

export const trackedEventsReportOptions = (
  payload: FirstParam<typeof generateTrackedEventsReport>,
) => {
  return queryOptions({
    queryKey: [...baseTrackedEventsKey, 'report', payload],
    queryFn: () => generateTrackedEventsReport(payload),
  });
};

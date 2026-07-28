import {listErrorLogItemsOptions} from '@common/admin/logging/error/error-log-queries';
import {listOutgoingEmailLogItemsOptions} from '@common/admin/logging/outgoing-email/outgoing-email-queries';
import {listScheduleLogItemsOptions} from '@common/admin/logging/schedule/schedule-queries';
import {shouldRevalidateDatatableLoader} from '@common/datatable/filters/utils/should-revalidate-datatable-loader';
import {queryClient} from '@common/http/query-client';
import {searchParamsFromUrl} from '@ui/utils/urls/search-params-from-url';
import {Navigate, RouteObject} from 'react-router';

export const adminLogsRoutes: Record<string, RouteObject> = {
  index: {
    path: 'logs',
    lazy: () => import('@common/admin/logging/logs-page'),
    children: [
      {
        index: true,
        element: <Navigate to="schedule" replace />,
      },
      {
        path: 'schedule',
        lazy: () =>
          import('@common/admin/logging/schedule/schedule-log-datatable'),
        shouldRevalidate: shouldRevalidateDatatableLoader,
        loader: ({request}) =>
          queryClient.ensureQueryData(
            listScheduleLogItemsOptions(searchParamsFromUrl(request.url)),
          ),
      },
      {
        path: 'error',
        lazy: () => import('@common/admin/logging/error/error-log-datatable'),
        shouldRevalidate: shouldRevalidateDatatableLoader,
        loader: ({request}) =>
          queryClient.ensureQueryData(
            listErrorLogItemsOptions(searchParamsFromUrl(request.url)),
          ),
      },
      {
        path: 'outgoing-email',
        lazy: () =>
          import('@common/admin/logging/outgoing-email/outgoing-email-log-datatable'),
        shouldRevalidate: shouldRevalidateDatatableLoader,
        loader: ({request}) =>
          queryClient.ensureQueryData(
            listOutgoingEmailLogItemsOptions(
              searchParamsFromUrl(request.url),
            ),
          ),
      },
    ],
  },
};

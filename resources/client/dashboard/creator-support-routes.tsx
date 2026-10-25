import {CreatorSupportInboxProvider} from '@app/dashboard/conversations/creator-support-inbox-context';
import {helpdeskQueries} from '@app/dashboard/helpdesk-queries';
import {shouldRevalidateDatatableLoader} from '@common/datatable/filters/utils/should-revalidate-datatable-loader';
import {queryClient} from '@common/http/query-client';
import {Navigate, Outlet, RouteObject} from 'react-router';

/**
 * Creator-owned support inbox (Phase 5). Uses agent conversation UI scoped via
 * `scope=creator` on list API calls.
 */
export const creatorSupportRoutes: RouteObject[] = [
  {
    path: 'support',
    element: (
      <CreatorSupportInboxProvider>
        <Outlet />
      </CreatorSupportInboxProvider>
    ),
    handle: {customDashboardLayout: true},
    children: [
      {
        index: true,
        element: <Navigate to="conversations?viewId=all" replace />,
      },
      {
        path: 'conversations',
        shouldRevalidate: shouldRevalidateDatatableLoader,
        lazy: () =>
          import(
            '@app/dashboard/conversations/conversations-table/conversations-table-page'
          ),
        loader: () =>
          queryClient.ensureQueryData(
            helpdeskQueries.conversations.index({viewId: 'all', scope: 'creator'}),
          ),
      },
      {
        path: 'conversations/:conversationId',
        lazy: () =>
          import(
            '@app/dashboard/conversations/conversation-page/conversation-page'
          ),
        loader: async ({params}) =>
          Promise.allSettled([
            queryClient.ensureQueryData(
              helpdeskQueries.statuses.dropdownList('agent'),
            ),
            queryClient.ensureQueryData(
              helpdeskQueries.conversations.get(params.conversationId!),
            ),
            queryClient.ensureInfiniteQueryData(
              helpdeskQueries.conversations.messages(params.conversationId!),
            ),
          ]),
      },
    ],
  },
];

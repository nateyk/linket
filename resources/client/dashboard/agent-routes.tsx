import {aiAgentRoutes} from '@ai/ai-agent/ai-agent-routes';
import {cannedRepliesRoutes} from '@app/canned-replies/canned-replies-routes';
import {customersRoutes} from '@app/dashboard/contacts/customers-routes';
import {helpdeskReportRoutes} from '@app/dashboard/reports/helpdesk-reports-routes';
import {getConversationListLayout} from '@app/dashboard/conversations/conversation-page/use-agent-inbox-layout';
import {helpdeskQueries} from '@app/dashboard/helpdesk-queries';
import {teamRoutes} from '@app/dashboard/team-routes';
import {viewsRoutes} from '@app/dashboard/views/views-routes';
import {hcManagerRoutes} from '@app/help-center/manager/hc-manager-routes';
import {shouldRevalidateDatatableLoader} from '@common/datatable/filters/utils/should-revalidate-datatable-loader';
import {PageErrorMessage} from '@common/http/errors/page-error-message';
import {queryClient} from '@common/http/query-client';
import {listNotificationSubscriptionsOptions} from '@common/notifications/notifications-queries';
import {searchParamsFromUrl} from '@ui/utils/urls/search-params-from-url';
import {campaignsRoutes} from '@livechat/dashboard/campaigns/campaigns-routes';
import {Navigate, Outlet, redirect, RouteObject} from 'react-router';

/**
 * Platform agent inbox (BeDesk). Mounted at /agent so it does not collide with
 * Linket creator /dashboard (bio store).
 */
export const agentRoutes: RouteObject[] = [
  {
    path: 'agent',
    lazy: () =>
      import('@app/dashboard/dashboard-layout/helpdesk-dashboard-layout'),
    children: [
      ...hcManagerRoutes,
      {
        path: 'notifications',
        lazy: () => import('@app/dashboard/agent-notification-settings-page'),
        loader: () =>
          queryClient.ensureQueryData(listNotificationSubscriptionsOptions()),
      },
      {
        index: true,
        element: <Navigate to="conversations" />,
      },
      {
        path: 'conversations/new',
        handle: {customDashboardLayout: true},
        lazy: () =>
          import(
            '@app/dashboard/conversations/new-conversation-page/new-conversation-page'
          ),
        loader: async () =>
          Promise.allSettled([
            queryClient.ensureQueryData(
              helpdeskQueries.statuses.dropdownList('agent'),
            ),
            queryClient.ensureQueryData(
              helpdeskQueries.attributes.normalizedList({
                type: 'conversation',
                for: 'agent',
              }),
            ),
          ]),
      },
      {
        path: 'conversations/search',
        lazy: () =>
          import('@app/dashboard/conversations/conversations-search-page'),
        shouldRevalidate: shouldRevalidateDatatableLoader,
        loader: ({request}) => {
          const searchParams = searchParamsFromUrl(request.url);
          const promises: Promise<unknown>[] = [
            queryClient.ensureQueryData(
              helpdeskQueries.attributes.normalizedList({
                type: 'conversation',
                for: 'agent',
              }),
            ),
          ];

          if (searchParams.filters || searchParams.query) {
            promises.push(
              queryClient.ensureQueryData(
                helpdeskQueries.conversations.search(searchParams),
              ),
            );
          }

          return Promise.allSettled(promises);
        },
      },
      {
        handle: {customDashboardLayout: true},
        loader: async ({request, params}) => {
          const url = new URL(request.url);
          const selectedLayout = getConversationListLayout();

          const data = await Promise.allSettled([
            queryClient.ensureQueryData(
              helpdeskQueries.conversations.inboxViews,
            ),
            queryClient.ensureQueryData(
              helpdeskQueries.conversations.index(
                Object.fromEntries(url.searchParams),
              ),
            ),
          ]);

          if (data[0].status === 'rejected' || data[1].status === 'rejected') {
            return <PageErrorMessage />;
          }

          const firstConversation = data[1].value.pagination.data[0];
          let redirectUrl: URL | null = null;

          if (!url.searchParams.has('viewId')) {
            url.searchParams.append('viewId', 'all');
            redirectUrl = url;
          }

          if (
            selectedLayout === 'chat' &&
            !params.conversationId &&
            firstConversation
          ) {
            url.pathname = `/agent/conversations/${firstConversation.id}`;
            redirectUrl = url;
          }

          if (redirectUrl) {
            return redirect(redirectUrl.toString());
          }

          return data;
        },
        element: <Outlet />,
        children: [
          {
            path: 'conversations',
            shouldRevalidate: shouldRevalidateDatatableLoader,
            lazy: () =>
              import(
                '@app/dashboard/conversations/conversations-table/conversations-table-page'
              ),
            loader: () =>
              queryClient.ensureQueryData(
                helpdeskQueries.attributes.normalizedList({
                  type: 'conversation',
                  for: 'agent',
                }),
              ),
          },
          {
            path: 'conversations/:conversationId',
            lazy: () =>
              import(
                '@app/dashboard/conversations/conversation-page/conversation-page'
              ),
            loader: async ({params}) => {
              return Promise.allSettled([
                queryClient.ensureQueryData(
                  helpdeskQueries.statuses.dropdownList('agent'),
                ),
                queryClient.ensureQueryData(
                  helpdeskQueries.conversations.get(params.conversationId!),
                ),
                queryClient.ensureInfiniteQueryData(
                  helpdeskQueries.conversations.messages(
                    params.conversationId!,
                  ),
                ),
              ]);
            },
          },
        ],
      },
      ...customersRoutes,
      ...viewsRoutes,
      ...teamRoutes,
      ...helpdeskReportRoutes,
      ...campaignsRoutes,
      ...aiAgentRoutes,
      {
        path: 'ai-agents',
        element: <Navigate to="/agent/ai-agent" replace />,
      },
      ...cannedRepliesRoutes(true),
    ],
  },
];

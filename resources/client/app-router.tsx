import {
  listWebhookAttemptsOptions,
  retrieveWebhookAttemptOptions,
  retrieveWebhookOptions,
} from '@app/account-settings/webhooks/webhook-queries';
import {adminRoutes} from '@app/admin/admin-routes';
import {dashboardRoutes} from '@app/dashboard/dashboard-routes';
import {retrieveLinkPageOptions} from '@app/dashboard/link-pages/link-pages-queries';
import {landingPageDataQueryOptions} from '@app/landing/use-landing-page-data';
import {getSettingsPreviewMode} from '@common/admin/settings/preview/use-settings-preview-mode';
import {listProductsOptions} from '@common/admin/subscriptions/products-queries';
import {authRoutes} from '@common/auth/auth-routes';
import {getAccountSettingsOptions} from '@common/auth/ui/account-settings/account-settings-queries';
import {auth} from '@common/auth/use-auth';
import {billingPageChildRoutes} from '@common/billing/billing-page/billing-page-routes';
import {checkoutRoutes} from '@common/billing/checkout/checkout-routes';
import {
  RootErrorElement,
  RootRoute,
  rootRouteMiddleware,
} from '@common/core/common-provider';
import {commonRoutes} from '@common/core/common-routes';
import {queryClient} from '@common/http/query-client';
import {notificationRoutes} from '@common/notifications/notification-routes';
import {
  listWorkspaceRolesOptions,
  listWorkspacesOptions,
  retrieveWorkspaceOptions,
} from '@common/workspace/workspace-queries';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {FullPageLoader} from '@ui/progress/full-page-loader';
import {createBrowserRouter, redirect} from 'react-router';
import {Fragment} from 'react/jsx-runtime';

export const appRouter = createBrowserRouter(
  [
    {
      id: 'root',
      element: <RootRoute />,
      errorElement: <RootErrorElement />,
      middleware: rootRouteMiddleware,
      hydrateFallbackElement: <FullPageLoader screen />,
      children: [
        {
          path: '/',
          loader: async () => {
            const isLoggedIn = auth.isLoggedIn;
            const loaders = getBootstrapData().loaders;
            const linkeableData = loaders?.linkeablePage;
            const publicDigitalProductPage =
              loaders?.digitalProductPage ||
              loaders?.digitalProductOrderSuccessPage;

            if (!linkeableData && !publicDigitalProductPage) {
              if (
                !isLoggedIn &&
                getBootstrapData().settings.homepage.type === 'loginPage' &&
                !getSettingsPreviewMode().isInsideSettingsPreview
              ) {
                return redirect('/login');
              }

              if (
                isLoggedIn &&
                !getSettingsPreviewMode().isInsideSettingsPreview
              ) {
                return redirect(getBootstrapData().auth_redirect_uri);
              }
            }

            return await queryClient.ensureQueryData(
              landingPageDataQueryOptions,
            );
          },
          lazy: () => {
            const loaders = getBootstrapData().loaders;
            if (
              loaders?.linkeablePage ||
              loaders?.digitalProductPage ||
              loaders?.digitalProductOrderSuccessPage
            ) {
              return import('@app/short-links/linkeable-renderer');
            }
            return import('@app/landing/landing-page');
          },
        },
        ...authRoutes({
          loginRoute: {
            lazy: () => import('@app/auth/app-login-page'),
          },
          registerRoute: {
            lazy: () => import('@app/auth/app-register-page'),
          },
          accountSettingsRoute: {
            lazy: () =>
              import('@app/account-settings/app-account-settings-page'),
            loader: () =>
              queryClient.ensureQueryData(getAccountSettingsOptions()),
            children: [
              {
                index: true,
                element: <Fragment />,
                middleware: [
                  () => {
                    throw redirect('/account-settings/general');
                  },
                ],
              },
              {
                path: 'general',
                lazy: async () => {
                  const {GeneralSettingsPanel} =
                    await import('@app/account-settings/app-account-settings-page');
                  return {Component: GeneralSettingsPanel};
                },
              },
              {
                path: 'security',
                lazy: async () => {
                  const {SecuritySettingsPanel} =
                    await import('@app/account-settings/app-account-settings-page');
                  return {Component: SecuritySettingsPanel};
                },
              },
              {
                path: 'api-keys',
                lazy: () => import('@app/account-settings/access-tokens-page'),
                middleware: [
                  () => {
                    if (!auth.hasPermission('api.access')) {
                      throw redirect('/account-settings/general');
                    }
                  },
                ],
              },

              // billing
              {
                path: 'billing',
                lazy: () =>
                  import('@app/account-settings/app-billing-page-layout'),
                handle: {billingRoutePrefix: '/account-settings'}, // for generating breadcrumbs, see billing-page-routes.tsx
                children: billingPageChildRoutes({
                  indexRoute: {
                    lazy: () =>
                      import('@app/account-settings/billing/billing-page'),
                  },
                }),
              },

              // workspaces
              {
                path: 'workspaces',
                lazy: () => import('@common/workspace/workspaces-datatable'),
                loader: () =>
                  queryClient.ensureQueryData(listWorkspacesOptions()),
              },
              {
                path: 'workspaces/:workspaceId',
                lazy: () =>
                  import('@common/workspace/workspace-page/workspace-page'),
                loader: async ({params}) => {
                  await Promise.all([
                    queryClient.ensureQueryData(
                      retrieveWorkspaceOptions(Number(params.workspaceId!)),
                    ),
                    queryClient.ensureQueryData(listWorkspaceRolesOptions()),
                  ]);
                },
                children: [
                  {
                    index: true,
                    lazy: () =>
                      import('@common/workspace/workspace-page/workspace-members-table'),
                  },
                  {
                    path: 'invites',
                    lazy: () =>
                      import('@common/workspace/workspace-page/workspace-invites-table'),
                  },
                ],
              },

              // webhooks
              {
                path: 'webhooks',
                lazy: () =>
                  import('@app/account-settings/webhooks/webhooks-list-page'),
              },
              {
                path: 'webhooks/new',
                lazy: () =>
                  import('@app/account-settings/webhooks/create-webhook-page'),
              },
              {
                path: 'webhooks/:webhookId',
                lazy: () =>
                  import('@app/account-settings/webhooks/webhook-details-page'),
                loader: ({params}) =>
                  queryClient.ensureQueryData(
                    retrieveWebhookOptions(params.webhookId!),
                  ),
                children: [
                  {
                    index: true,
                    lazy: () =>
                      import('@app/account-settings/webhooks/webhook-attempts-page'),
                    loader: ({params}) =>
                      queryClient.ensureQueryData(
                        listWebhookAttemptsOptions(params.webhookId!),
                      ),
                  },
                  {
                    path: 'settings',
                    lazy: () =>
                      import('@app/account-settings/webhooks/webhook-settings-page'),
                  },
                ],
              },
              {
                path: 'webhooks/:webhookId/logs/:attemptId',
                lazy: () =>
                  import('@app/account-settings/webhooks/webhook-attempt-details-page'),
                loader: ({params}) =>
                  queryClient.ensureQueryData(
                    retrieveWebhookAttemptOptions(
                      params.webhookId!,
                      params.attemptId!,
                    ),
                  ),
              },
            ],
          },
        }),
        ...notificationRoutes,
        ...dashboardRoutes,
        ...adminRoutes,
        ...checkoutRoutes,

        // pricing and common billing overrides
        {
          path: 'billing',
          element: <Fragment />,
          middleware: [
            () => {
              throw redirect('/account-settings/billing');
            },
          ],
        },
        {
          path: 'pricing',
          lazy: () => import('@common/billing/pricing-table/pricing-page'),
          loader: () => queryClient.ensureQueryData(listProductsOptions()),
        },

          {path: 'find-my-purchase', lazy: () => import('@app/digital-products/public/order-lookup-page')},
          {path: 'find-my-purchase/orders', lazy: () => import('@app/digital-products/public/order-lookup-page')},
        ...commonRoutes,
        {
          path: '/link-pages/:pageId/preview',
          lazy: () => import('@app/dashboard/link-pages/preview-link-page'),
          loader: ({params}) =>
            queryClient.ensureQueryData(
              retrieveLinkPageOptions(Number(params.pageId!)),
            ),
        },
        {
          path: '*',
          lazy: () => import('@app/short-links/linkeable-renderer'),
        },
      ],
    },
  ],
  {
    basename: getBootstrapData().settings.html_base_uri,
  },
);

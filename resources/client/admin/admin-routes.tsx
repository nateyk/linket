import {listStoresOptions} from '@app/dashboard/stores/stores-queries';
import {sharedDashboardRoutes} from '@app/dashboard/dashboard-routes';
import {serviceCategoriesAdminOptions} from '@app/admin/service-categories/service-categories-admin-queries';
import {adminCustomPagesRoutes} from '@common/admin/custom-pages/admin-custom-pages-routes';
import {adminFileEntriesRoutes} from '@common/admin/file-entry/admin-file-entries-routes';
import {adminBlogRoutes} from '@common/admin/blog/admin-blog-routes';
import {adminLogsRoutes} from '@common/admin/logging/admin-logs-routes';
import {adminRolesRoutes} from '@common/admin/roles/admin-roles-routes';
import {commonAdminSettingsRoutes} from '@common/admin/settings/common-admin-settings-routes';
import {adminBillingRoutes} from '@common/admin/subscriptions/admin-billing-routes';
import {adminLocalizationsRoutes} from '@common/admin/translations/admin-localizations-routes';
import {adminUsersRoutes} from '@common/admin/users/admin-users-routes';
import {adminQueries} from '@app/admin/admin-queries';
import {authGuard} from '@common/auth/guards/auth-route';
import {shouldRevalidateDatatableLoader} from '@common/datatable/filters/utils/should-revalidate-datatable-loader';
import {queryClient} from '@common/http/query-client';
import {searchParamsFromUrl} from '@ui/utils/urls/search-params-from-url';
import {redirect, RouteObject} from 'react-router';
import {Fragment} from 'react/jsx-runtime';

export const adminRoutes: RouteObject[] = [
  {
    path: 'admin',
    loader: () => authGuard({permission: 'admin.access'}),
    lazy: () => import('@common/admin/admin-layout'),
    children: [
      {
        index: true,
        element: <Fragment />,
        middleware: [() => redirect('/admin/insights')],
      },
      {
        path: 'insights',
        lazy: () => import('@app/admin/reports/admin-insights-page-layout'),
        children: [
          {
            index: true,
            lazy: () => import('@app/admin/reports/admin-commerce-insights'),
          },
          {
            path: 'events',
            lazy: () =>
              import('@app/admin/reports/admin-tracked-events-insights'),
          },
          {
            path: 'visitors',
            lazy: () => import('@app/admin/reports/admin-visitors-insights'),
          },
        ],
      },
      ...Object.values(adminUsersRoutes),
      ...Object.values(adminRolesRoutes),
      ...Object.values(adminBillingRoutes),
      ...Object.values(adminCustomPagesRoutes),
      ...Object.values(adminLocalizationsRoutes),
      ...Object.values(adminFileEntriesRoutes),
      ...Object.values(adminLogsRoutes),

      // Legacy admin Help Center → BeDesk HC manager in agent app
      {
        path: 'help',
        loader: () => redirect('/agent/hc/arrange', 301),
      },

      // Phase 2 — attributes + triggers (BeDesk-native admin)
      {
        path: 'attributes',
        shouldRevalidate: shouldRevalidateDatatableLoader,
        lazy: () =>
          import('@app/attributes/datatable/attributes-datatable-page'),
      },
      {
        path: 'attributes/new',
        lazy: () => import('@app/attributes/crupdate/create-attribute-page'),
      },
      {
        path: 'attributes/:id/edit',
        lazy: () => import('@app/attributes/crupdate/update-attribute-page'),
      },
      {
        path: 'triggers',
        shouldRevalidate: shouldRevalidateDatatableLoader,
        lazy: () => import('@app/triggers/triggers-datatable-page'),
        loader: async ({request}) => {
          const redirectTo = authGuard({permission: 'triggers.update'});
          if (redirectTo) return redirectTo;
          return await queryClient.ensureQueryData(
            adminQueries.triggers.index(searchParamsFromUrl(request.url)),
          );
        },
      },
      {
        path: 'triggers/new',
        lazy: () => import('@app/triggers/create-trigger-page'),
        loader: async () => {
          const redirectTo = authGuard({permission: 'triggers.update'});
          if (redirectTo) return redirectTo;
          return await queryClient.ensureQueryData(
            adminQueries.triggers.config(),
          );
        },
      },
      {
        path: 'triggers/:triggerId/edit',
        lazy: () => import('@app/triggers/update-trigger-page'),
        loader: async ({params}) => {
          const redirectTo = authGuard({permission: 'triggers.update'});
          if (redirectTo) return redirectTo;
          return await Promise.allSettled([
            queryClient.ensureQueryData(
              adminQueries.triggers.get(params.triggerId!),
            ),
            queryClient.ensureQueryData(adminQueries.triggers.config()),
          ]);
        },
      },

      ...adminBlogRoutes,
      {
        path: 'service-categories',
        lazy: () =>
          import('@app/admin/service-categories/admin-service-categories-page'),
        loader: async () => {
          const redirect = authGuard({permission: 'settings.update'});
          if (redirect) return redirect;
          await queryClient.ensureQueryData(serviceCategoriesAdminOptions());
        },
      },

      commonAdminSettingsRoutes(
        [
          {
            path: 'search',
            lazy: () =>
              import('@common/admin/settings/pages/search-settings/search-settings'),
          },
          {
            path: 'links',
            lazy: () =>
              import('@app/admin/settings/link-settings/link-settings'),
          },
          {
            path: 'biolinks',
            lazy: () => import('@app/admin/settings/biolink-settings'),
          },
          {
            path: 'kyc',
            lazy: () => import('@app/admin/settings/kyc-settings'),
          },
          {
            path: 'product',
            lazy: () => import('@app/admin/settings/product-settings'),
          },
          {
            path: 'landing-page',
            lazy: () => import('@app/admin/settings/landing-page-settings'),
          },
          {
            path: 'hc',
            lazy: () => import('@app/admin/settings/hc/hc-settings'),
          },
          {
            path: 'ai',
            lazy: () =>
              import('@ai/admin/settings/ai-settings-page'),
          },
          {
            path: 'livechat',
            lazy: () =>
              import('@livechat/admin/settings/livechat-settings'),
          },
          {
            path: 'ads',
            lazy: () => import('@common/admin/settings/pages/ads-settings'),
          },
        ],
        {
          general: {
            lazy: () => import('@app/admin/settings/app-general-settings'),
          },
          captcha: {
            lazy: () => import('@app/admin/settings/captcha-settings'),
          },
        },
      ),
      ...sharedDashboardRoutes('admin'),
      {
        path: 'stores',
        lazy: () =>
          import('@app/admin/biolinks-datatable-page/biolinks-datatable-page'),
        loader: ({request}) =>
          queryClient.ensureQueryData(
            listStoresOptions('admin', {
              ...searchParamsFromUrl(request.url),
              fields_preset: 'datatable',
            }),
          ),
      },
      {
        path: 'biolinks',
        loader: () => redirect('/admin/stores', 308),
      },
      {
        path: 'items',
        lazy: () => import('@app/admin/digital-products/admin-digital-products-page'),
      },
      {
        path: 'items/payouts',
        lazy: () => import('@app/admin/digital-products/admin-digital-product-payouts-page'),
      },
      {
        path: 'items/:productId/reviews',
        lazy: () =>
          import('@app/admin/digital-products/admin-product-reviews-page'),
      },
      {
        path: 'items/:productId',
        lazy: () =>
          import('@app/admin/digital-products/admin-digital-product-detail-page'),
      },
      {
        path: 'payment-activity',
        lazy: () => import('@app/admin/digital-products/admin-payment-activity-page'),
      },
      {
        path: 'kyc-verifications',
        lazy: () =>
          import('@app/admin/kyc/admin-kyc-verifications-page'),
      },
      {
        path: 'withdrawals',
        lazy: () => import('@app/admin/withdrawals/admin-withdrawals-page'),
      },
      {
        path: 'withdrawals/:withdrawalId/review',
        lazy: () => import('@app/admin/withdrawals/admin-withdrawal-review-page'),
      },
      {
        path: 'financial/withdrawal-methods',
        lazy: () => import('@app/admin/financial/admin-withdrawal-methods-page'),
      },
      {
        path: 'financial/withdrawal-methods/create',
        lazy: () => import('@app/admin/financial/admin-withdrawal-method-create-page'),
      },
      {
        path: 'financial/withdrawal-methods/:methodId/edit',
        lazy: () => import('@app/admin/financial/admin-withdrawal-method-edit-page'),
      },
      {
        path: 'items/delivery-history',
        lazy: () => import('@app/admin/digital-products/admin-order-recovery-deliveries-page'),
      },
    ],
  },
];

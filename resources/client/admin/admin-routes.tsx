import {listBiolinksOptions} from '@app/dashboard/biolink/biolinks-queries';
import {sharedDashboardRoutes} from '@app/dashboard/dashboard-routes';
import {adminCustomPagesRoutes} from '@common/admin/custom-pages/admin-custom-pages-routes';
import {adminFileEntriesRoutes} from '@common/admin/file-entry/admin-file-entries-routes';
import {adminLogsRoutes} from '@common/admin/logging/admin-logs-routes';
import {adminRolesRoutes} from '@common/admin/roles/admin-roles-routes';
import {commonAdminSettingsRoutes} from '@common/admin/settings/common-admin-settings-routes';
import {adminBillingRoutes} from '@common/admin/subscriptions/admin-billing-routes';
import {adminLocalizationsRoutes} from '@common/admin/translations/admin-localizations-routes';
import {adminUsersRoutes} from '@common/admin/users/admin-users-routes';
import {authGuard} from '@common/auth/guards/auth-route';
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
            lazy: () =>
              import('@app/admin/reports/admin-tracked-events-insights'),
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
            path: 'landing-page',
            lazy: () => import('@app/admin/settings/landing-page-settings'),
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
        path: 'biolinks',
        lazy: () =>
          import('@app/admin/biolinks-datatable-page/biolinks-datatable-page'),
        loader: ({request}) =>
          queryClient.ensureQueryData(
            listBiolinksOptions('admin', {
              ...searchParamsFromUrl(request.url),
              fields_preset: 'datatable',
            }),
          ),
      },
      {
        path: 'digital-products',
        lazy: () => import('@app/admin/digital-products/admin-digital-products-page'),
      },
      {
        path: 'digital-products/payouts',
        lazy: () => import('@app/admin/digital-products/admin-digital-product-payouts-page'),
      },
      {
        path: 'payment-activity',
        lazy: () => import('@app/admin/digital-products/admin-payment-activity-page'),
      },
    ],
  },
];

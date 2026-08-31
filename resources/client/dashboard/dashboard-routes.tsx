import {
  listStoresOptions,
  retrieveBiolinkOptions,
  retrieveStoreOptions,
} from '@app/dashboard/stores/stores-queries';
import {retrieveDomainOptions} from '@app/dashboard/custom-domains/domains-queries';
import {
  listFoldersOptions,
  retrieveFolderOptions,
} from '@app/dashboard/folders/folders-queries';
import {
  listLinkOverlaysOptions,
  retrieveLinkOverlayOptions,
} from '@app/dashboard/link-overlays/link-overlays-queries';
import {
  listLinkPagesOptions,
  retrieveLinkPageOptions,
} from '@app/dashboard/link-pages/link-pages-queries';
import {
  listLinksOptions,
  retrieveLinkOptions,
} from '@app/dashboard/links/links-queries';
import {
  listQrCodesOptions,
  retrieveQrCodeOptions,
} from '@app/dashboard/qr-codes/qr-codes-queries';
import {listTrackingPixelsOptions} from '@app/dashboard/tracking-pixels/tracking-pixels-queries';
import {DatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {usageOptions} from '@app/dashboard/use-usage';
import {auth} from '@common/auth/use-auth';
import {queryClient} from '@common/http/query-client';
import {listWorkspacesOptions} from '@common/workspace/workspace-queries';
import {useWorkspaceStore} from '@common/workspace/workspace-store';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {searchParamsFromUrl} from '@ui/utils/urls/search-params-from-url';
import {redirect, RouteObject} from 'react-router';

export const sharedDashboardRoutes = (routeType: DatatableRouteType) => {
  const isDashboard = routeType === 'dashboard';
  const routes: RouteObject[] = [];

  // links — admin only (internalized for creator dashboard)
  if (!isDashboard) {
    routes.push(
      {
        path: 'links',
        lazy: () =>
          import('@app/dashboard/links/links-datatable-page/links-datatable-page'),
        loader: ({request}) =>
          queryClient.ensureQueryData(
            listLinksOptions(routeType, searchParamsFromUrl(request.url)),
          ),
      },
      {
        path: 'links/:linkId',
        lazy: () =>
          import('@app/dashboard/links/link-details-page/link-details-page'),
        loader: ({params}) =>
          queryClient.ensureQueryData(
            retrieveLinkOptions(Number(params.linkId!)),
          ),
        children: [
          {
            index: true,
            lazy: () =>
              import('@app/dashboard/links/link-details-page/link-settings-page'),
          },
          {
            path: 'insights',
            lazy: () =>
              import('@app/dashboard/links/link-details-page/link-insights-page'),
          },
        ],
      },
    );
  }

  // qr codes — admin only (disabled from creator dashboard)
  if (!isDashboard) {
    routes.push(
      {
        path: 'qr-codes',
        lazy: () =>
          import('@app/dashboard/qr-codes/qr-codes-datatable-page/qr-codes-datatable-page'),
        loader: ({request}) =>
          queryClient.ensureQueryData(
            listQrCodesOptions(routeType, searchParamsFromUrl(request.url)),
          ),
      },
      {
        path: 'qr-codes/:qrCodeId',
        lazy: () =>
          import('@app/dashboard/qr-codes/qr-code-details-page/qr-code-details-page'),
        loader: ({params}) =>
          queryClient.ensureQueryData(
            retrieveQrCodeOptions(Number(params.qrCodeId!)),
          ),
        children: [
          {
            index: true,
            lazy: () =>
              import('@app/dashboard/qr-codes/qr-code-details-page/qr-code-settings-page'),
          },
          {
            path: 'insights',
            lazy: () =>
              import('@app/dashboard/qr-codes/qr-code-details-page/qr-code-insights-page'),
          },
        ],
      },
    );
  }

  // stores — canonical storefront editor (replaces biolinks)
  routes.push({
    path: 'stores/:storeId',
    lazy: () => import('@app/dashboard/stores/store-editor/store-editor-page'),
    loader: ({params}) =>
      queryClient.ensureQueryData(
        retrieveStoreOptions(String(params.storeId!)),
      ),
    children: [
      {
        index: true,
        lazy: async () => {
          const {BiolinkContentTab} =
            await import('@app/dashboard/stores/store-editor/store-editor-page');
          return {Component: BiolinkContentTab};
        },
      },
      {
        path: 'about',
        lazy: async () => {
          const {BiolinkAboutTab} =
            await import('@app/dashboard/stores/store-editor/store-editor-page');
          return {Component: BiolinkAboutTab};
        },
      },
      {
        path: 'appearance',
        lazy: () =>
          import('@app/dashboard/stores/store-editor/appearance/biolink-appearance-tab'),
      },
      {
        path: 'insights',
        lazy: () => import('@app/dashboard/stores/store-insights-page'),
      },
    ],
  });

  // biolinks — legacy alias, 308 redirect to stores
  routes.push({
    path: 'biolinks/:biolinkId',
    loader: ({params}) =>
      redirect(`/${routeType}/stores/${params.biolinkId}`, 308),
  });

  // folders — admin only (disabled from creator dashboard)
  if (!isDashboard) {
    routes.push(
      {
        path: 'folders',
        lazy: () =>
          import('@app/dashboard/folders/folders-datatable-page/folders-datatable-page'),
        loader: ({request}) =>
          queryClient.ensureQueryData(
            listFoldersOptions(routeType, searchParamsFromUrl(request.url)),
          ),
      },
      {
        path: 'folders/:folderId',
        lazy: () =>
          import('@app/dashboard/folders/folder-details-page/folder-details-page'),
        loader: ({params}) =>
          queryClient.ensureQueryData(
            retrieveFolderOptions(Number(params.folderId!)),
          ),
        children: [
          {
            index: true,
            lazy: () =>
              import('@app/dashboard/folders/folder-details-page/folder-settings-page'),
          },
          {
            path: 'insights',
            lazy: () =>
              import('@app/dashboard/folders/folder-details-page/folder-insights-page'),
          },
          {
            path: 'links',
            lazy: () =>
              import('@app/dashboard/folders/folder-links-datatable-page/folder-links-datatable-page'),
            loader: ({request, params}) =>
              queryClient.ensureQueryData(
                listLinksOptions(routeType, {
                  ...searchParamsFromUrl(request.url),
                  folder_id: Number(params.folderId!),
                }),
              ),
          },
        ],
      },
      {
        path: 'folders/:folderId/links/:linkId',
        lazy: () =>
          import('@app/dashboard/links/link-details-page/link-details-page'),
        loader: ({params}) =>
          Promise.allSettled([
            queryClient.ensureQueryData(
              retrieveFolderOptions(Number(params.folderId!)),
            ),
            queryClient.ensureQueryData(
              retrieveLinkOptions(Number(params.linkId!)),
            ),
          ]),
        children: [
          {
            index: true,
            lazy: () =>
              import('@app/dashboard/links/link-details-page/link-settings-page'),
          },
          {
            path: 'insights',
            lazy: () =>
              import('@app/dashboard/links/link-details-page/link-insights-page'),
          },
        ],
      },
      {
        path: 'folders/:folderId/links/:linkId/edit',
        lazy: () =>
          import('@app/dashboard/links/link-details-page/link-settings-page'),
        loader: ({params}) =>
          Promise.allSettled([
            queryClient.ensureQueryData(
              retrieveFolderOptions(Number(params.folderId!)),
            ),
            queryClient.ensureQueryData(
              retrieveLinkOptions(Number(params.linkId!)),
            ),
          ]),
      },
    );
  }

  // custom domains — admin only (disabled from creator dashboard)
  if (!isDashboard) {
    routes.push(
      {
        path: 'custom-domains',
        lazy: () =>
          import('@app/dashboard/custom-domains/domains-datatable-page'),
      },
      {
        path: 'custom-domains/:domainId',
        lazy: () =>
          import('@app/dashboard/custom-domains/domain-insights-page'),
        loader: ({params}) =>
          queryClient.ensureQueryData(
            retrieveDomainOptions(Number(params.domainId!)),
          ),
      },
    );
  }

  // tracking pixels — kept for both (PRO growth tool)
  routes.push({
    path: 'pixels',
    shouldRevalidate: () => false,
    lazy: () =>
      import('@app/dashboard/tracking-pixels/tracking-pixels-datatable-page'),
    loader: ({request}) =>
      queryClient.ensureQueryData(
        listTrackingPixelsOptions(routeType, searchParamsFromUrl(request.url)),
      ),
  });

  // CTA overlays — admin only (disabled from creator dashboard)
  if (!isDashboard) {
    routes.push(
      {
        path: 'link-overlays',
        shouldRevalidate: () => false,
        lazy: () =>
          import('@app/dashboard/link-overlays/link-overlays-datatable-page/link-overlays-datatable-page'),
        loader: ({request}) =>
          queryClient.ensureQueryData(
            listLinkOverlaysOptions(
              routeType,
              searchParamsFromUrl(request.url),
            ),
          ),
      },
      {
        path: 'link-overlays/new',
        lazy: () =>
          import('@app/dashboard/link-overlays/crupdate/create-link-overlay-page'),
      },
      {
        path: 'link-overlays/:overlayId',
        lazy: () =>
          import('@app/dashboard/link-overlays/crupdate/update-link-overlay-page'),
        loader: ({params}) =>
          queryClient.ensureQueryData(
            retrieveLinkOverlayOptions(Number(params.overlayId!)),
          ),
      },
    );
  }

  // link pages — admin only (disabled from creator dashboard)
  if (!isDashboard) {
    routes.push(
      {
        path: 'link-pages',
        lazy: () =>
          import('@app/dashboard/link-pages/link-pages-datatable-page/link-pages-datatable-page'),
        loader: ({request}) =>
          queryClient.ensureQueryData(
            listLinkPagesOptions(routeType, searchParamsFromUrl(request.url)),
          ),
      },
      {
        path: 'link-pages/new',
        lazy: () => import('@app/dashboard/link-pages/create-link-page'),
      },
      {
        path: 'link-pages/:pageId',
        lazy: () => import('@app/dashboard/link-pages/edit-link-page'),
        loader: ({params}) =>
          queryClient.ensureQueryData(
            retrieveLinkPageOptions(Number(params.pageId!)),
          ),
      },
    );
  }

  // keep biolink query compat for old imports that still use retrieveBiolinkOptions
  // (stores and biolinks share same table until Phase 3 flag)
  void retrieveBiolinkOptions;

  return routes;
};

export const dashboardRoutes: RouteObject[] = [
  {
    path: 'dashboard',
    middleware: [
      () => {
        if (!auth.isLoggedIn) {
          throw redirect('/login');
        }
      },
      async () => {
        if (!useWorkspaceStore.getState().workspaces.length) {
          // will be loaded already via bootstrap data
          const response = await queryClient.ensureQueryData(
            listWorkspacesOptions(),
          );
          useWorkspaceStore.getState().init(response.data);
        }
      },
    ],
    lazy: () => import('@app/dashboard/layout/app-dasbboard-layout'),
    handle: {belinkRoutesType: 'dashboard'},
    loader: () => {
      // no need to wait for the query to complete
      queryClient.ensureQueryData(usageOptions());
    },
    children: [
      {
        index: true,
        loader: () => {
          const homepage = getBootstrapData().settings.dashboard?.homepage;
          const homepageRoutes: Record<string, string> = {
            biolinks: '/dashboard/stores',
            stores: '/dashboard/stores',
            'digital-products': '/dashboard/my-products',
            'sales-payouts': '/dashboard/sales-payouts',
            insights: '/dashboard/insights',
          };
          const destination = homepage ? homepageRoutes[homepage] : undefined;

          return destination ? redirect(destination) : null;
        },
        lazy: () => import('@app/dashboard/dashboard-home-page'),
      },
      {
        path: 'insights',
        lazy: () => import('@app/dashboard/reports/insights-page'),
        children: [
          {
            index: true,
            lazy: () =>
              import('@app/dashboard/reports/workspace-insights-page'),
          },
          {
            path: 'events',
            lazy: () =>
              import('@app/dashboard/reports/workspace-tracked-events-table-page'),
          },
        ],
      },
      {
        path: 'my-products',
        lazy: () =>
          import('@app/dashboard/digital-products/digital-products-page'),
      },
      {
        path: 'my-products/new',
        lazy: () =>
          import('@app/dashboard/digital-products/product-type-selection-page'),
      },
      {
        path: 'my-products/new/details',
        loader: ({request}) => {
          const url = new URL(request.url);
          return url.searchParams.get('type') === 'course'
            ? redirect('/dashboard/my-products/new/course')
            : null;
        },
        lazy: () =>
          import('@app/dashboard/digital-products/digital-product-form-page'),
      },
      {
        path: 'my-products/new/course',
        lazy: () => import('@app/dashboard/courses/create-course-page'),
      },
      {
        path: 'my-products/:productId/edit',
        lazy: () =>
          import('@app/dashboard/digital-products/digital-product-form-page'),
      },
      {
        path: 'my-products/:productId/course',
        lazy: () => import('@app/dashboard/courses/course-builder-page'),
      },
      {
        path: 'my-products/:productId/course/preview',
        lazy: () => import('@app/dashboard/courses/course-preview-page'),
      },
      {
        path: 'my-products/:productId/course/analytics',
        lazy: async () => {
          const m = await import('@app/dashboard/courses/course-analytics-page');
          return {Component: m.CourseAnalyticsPage};
        },
      },
      {
        path: 'my-products/:productId/reviews',
        lazy: () =>
          import('@app/dashboard/digital-products/product-reviews-page'),
      },
      {
        path: 'sales-payouts',
        lazy: () =>
          import('@app/dashboard/digital-products/sales-payouts-page'),
      },
      {
        path: 'commerce',
        loader: () => redirect('/dashboard'),
      },

      // stores — canonical
      {
        path: 'stores',
        lazy: () => import('@app/dashboard/stores/stores-page'),
        loader: ({request}) =>
          queryClient.ensureQueryData(
            listStoresOptions('dashboard', searchParamsFromUrl(request.url)),
          ),
      },
      // biolinks — legacy 308 alias
      {
        path: 'biolinks',
        loader: () => redirect('/dashboard/stores', 308),
      },

      ...sharedDashboardRoutes('dashboard'),
    ],
  },
];

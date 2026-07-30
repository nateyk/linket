import {
  listCurrentUserBiolinksOptions,
  retrieveBiolinkOptions,
} from '@app/dashboard/biolink/biolinks-queries';
import {getSelectedBiolinkId} from '@app/dashboard/biolink/use-selected-biolink-id';
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
import {getSettingsPreviewMode} from '@common/admin/settings/preview/use-settings-preview-mode';
import {auth} from '@common/auth/use-auth';
import {queryClient} from '@common/http/query-client';
import {listWorkspacesOptions} from '@common/workspace/workspace-queries';
import {useWorkspaceStore} from '@common/workspace/workspace-store';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {searchParamsFromUrl} from '@ui/utils/urls/search-params-from-url';
import {redirect, RouteObject} from 'react-router';
import {Fragment} from 'react/jsx-runtime';

export const sharedDashboardRoutes = (routeType: DatatableRouteType) => {
  const routes: RouteObject[] = [
    // links
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

    // qr codes
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

    // biolinks
    {
      path: 'biolinks/:biolinkId',
      lazy: () =>
        import('@app/dashboard/biolink/biolink-editor/biolink-editor-page'),
      loader: ({params}) =>
        queryClient.ensureQueryData(
          retrieveBiolinkOptions(Number(params.biolinkId!)),
        ),
      children: [
        {
          index: true,
          lazy: async () => {
            const {BiolinkContentTab} =
              await import('@app/dashboard/biolink/biolink-editor/biolink-editor-page');
            return {Component: BiolinkContentTab};
          },
        },
        {
          path: 'appearance',
          lazy: () =>
            import('@app/dashboard/biolink/biolink-editor/appearance/biolink-appearance-tab'),
        },
        {
          path: 'insights',
          lazy: () => import('@app/dashboard/biolink/biolink-insights-page'),
        },
      ],
    },

    // folders
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

    // domains
    {
      path: 'custom-domains',
      lazy: () =>
        import('@app/dashboard/custom-domains/domains-datatable-page'),
    },
    {
      path: 'custom-domains/:domainId',
      lazy: () => import('@app/dashboard/custom-domains/domain-insights-page'),
      loader: ({params}) =>
        queryClient.ensureQueryData(
          retrieveDomainOptions(Number(params.domainId!)),
        ),
    },

    // tracking pixels
    {
      path: 'pixels',
      shouldRevalidate: () => false,
      lazy: () =>
        import('@app/dashboard/tracking-pixels/tracking-pixels-datatable-page'),
      loader: ({request}) =>
        queryClient.ensureQueryData(
          listTrackingPixelsOptions(
            routeType,
            searchParamsFromUrl(request.url),
          ),
        ),
    },

    // overlays
    {
      path: 'link-overlays',
      shouldRevalidate: () => false,
      lazy: () =>
        import('@app/dashboard/link-overlays/link-overlays-datatable-page/link-overlays-datatable-page'),
      loader: ({request}) =>
        queryClient.ensureQueryData(
          listLinkOverlaysOptions(routeType, searchParamsFromUrl(request.url)),
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

    // link pages
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
  ];
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
        element: <Fragment />,
        middleware: [
          () => {
            if (!getSettingsPreviewMode().isInsideSettingsPreview) {
              throw redirect(getBootstrapData().auth_redirect_uri);
            }
          },
        ],
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
          import('@app/dashboard/digital-products/digital-product-form-page'),
      },
      {
        path: 'my-products/:productId/edit',
        lazy: () =>
          import('@app/dashboard/digital-products/digital-product-form-page'),
      },
      {
        path: 'sales-payouts',
        lazy: () =>
          import('@app/dashboard/digital-products/sales-payouts-page'),
      },

      // biolinks
      {
        path: 'biolinks',
        middleware: [
          async ({params}) => {
            const biolinks =
              (await queryClient.fetchQuery(listCurrentUserBiolinksOptions()))
                .data ?? [];

            // first check route params
            let biolinkId: number | string | null = params.biolinkId ?? null;

            // then see if user has selected active biolink previously
            if (!biolinkId) {
              biolinkId = getSelectedBiolinkId() || null;
            }

            // get selected biolink, or default to first one available
            let biolink = biolinkId
              ? biolinks.find(b => b.id === biolinkId)
              : null;
            if (!biolink) biolink = biolinks[0];

            if (biolink) {
              throw redirect(`/dashboard/biolinks/${biolink.id}`);
            }
          },
        ],
        lazy: () => import('@app/dashboard/biolink/no-biolinks-page'),
      },

      ...sharedDashboardRoutes('dashboard'),
    ],
  },
];

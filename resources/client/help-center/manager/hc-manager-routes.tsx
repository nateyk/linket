import {helpCenterQueries} from '@app/help-center/help-center-queries';
import {authGuard} from '@common/auth/guards/auth-route';
import {auth} from '@common/auth/use-auth';
import {shouldRevalidateDatatableLoader} from '@common/datatable/filters/utils/should-revalidate-datatable-loader';
import {queryClient} from '@common/http/query-client';
import {searchParamsFromUrl} from '@ui/utils/urls/search-params-from-url';
import {Navigate, Params, redirect, RouteObject} from 'react-router';

export const updateArticlePageLoader = async (params: Params) => {
  return await queryClient.ensureQueryData(
    helpCenterQueries.articles.getForUpdateArticlePage({
      articleId: params.articleId!,
      categoryId: params.categoryId,
      sectionId: params.sectionId,
    }),
  );
};

export function createHcManagerRoutes(
  prefix: 'hc' | 'help',
  root: '/agent/hc' | '/admin/help',
): RouteObject[] {
  // Admin bookmarks and agent-menu links should resolve to the same modern
  // admin dashboard. Non-admin staff must retain the agent Help Center.
  const canonicalizeAdminRoute = ({request}: {request: Request}) => {
    if (prefix !== 'hc' || !auth.hasPermission('admin.access')) return null;
    const url = new URL(request.url);
    const relativePath = url.pathname.replace(/^\/agent\/hc(?=\/|$)/, '');
    return redirect(`/admin/help${relativePath}${url.search}`, 302);
  };

  return [
  // article datatable
  {
    path: prefix,
    loader: canonicalizeAdminRoute,
    children: [
      {
        index: true,
        element: <Navigate to={`${root}/arrange`} replace />,
      },
      {
        path: 'articles',
        lazy: () =>
          import(
            '@app/help-center/articles/article-datatable/article-datatable-page'
          ),
        shouldRevalidate: shouldRevalidateDatatableLoader,
        loader: async ({request}) => {
          const redirect = authGuard({permission: 'articles.update'});
          if (redirect) return redirect;
          return await queryClient.ensureQueryData(
            helpCenterQueries.articles.index(searchParamsFromUrl(request.url)),
          );
        },
      },
      {
        path: 'articles/new',
        handle: {customDashboardLayout: true},
        lazy: () =>
          import(
            '@app/help-center/articles/article-editor/create-article-page'
          ),
        loader: async () => {
          const redirect = authGuard({permission: 'articles.update'});
          if (redirect) {
            return redirect;
          }

          return queryClient.ensureQueryData(
            helpCenterQueries.categories.normalizedList(),
          );
        },
      },
      {
        path: 'articles/:articleId/edit',
        handle: {customDashboardLayout: true},
        lazy: () =>
          import(
            '@app/help-center/articles/article-editor/update-article-page'
          ),
        loader: async ({params}) => {
          const redirect = authGuard({permission: 'articles.update'});
          if (redirect) return redirect;
          return await Promise.all([
            updateArticlePageLoader(params),
            queryClient.ensureQueryData(
              helpCenterQueries.categories.normalizedList(),
            ),
          ]);
        },
      },
    ],
  },

  // help center manager
  {
    path: `${prefix}/arrange`,
    loader: canonicalizeAdminRoute,
    children: [
      {
        index: true,
        lazy: async () => ({
          Component: (
            await import('@app/help-center/manager/hc-category-manager')
          ).CategoriesManager,
        }),
        loader: async () => {
          const redirect = authGuard({permission: 'articles.update'});
          if (redirect) return redirect;
          return await queryClient.ensureQueryData(
            helpCenterQueries.manager.categories(),
          );
        },
      },
      {
        path: 'categories/:categoryId',
        lazy: async () => ({
          Component: (
            await import('@app/help-center/manager/hc-category-manager')
          ).SectionsManager,
        }),
        loader: async ({params}) => {
          const redirect = authGuard({permission: 'articles.update'});
          if (redirect) return redirect;
          return await queryClient.ensureQueryData(
            helpCenterQueries.manager.sections(params.categoryId!),
          );
        },
      },
      {
        path: 'sections/:sectionId',
        lazy: async () => import('@app/help-center/manager/hc-article-manager'),
        loader: async ({params}) => {
          const redirect = authGuard({permission: 'articles.update'});
          if (redirect) return redirect;
          return await queryClient.ensureQueryData(
            helpCenterQueries.manager.articles(params.sectionId!),
          );
        },
      },

      // edit article
      {
        path: 'sections/:sectionId/articles/:articleId/edit',
        handle: {customDashboardLayout: true},
        lazy: () =>
          import(
            '@app/help-center/articles/article-editor/update-article-page'
          ),
        loader: async ({params}) => {
          const redirect = authGuard({permission: 'articles.update'});
          if (redirect) return redirect;
          return await updateArticlePageLoader(params);
        },
      },
      {
        path: 'categories/:categoryId/articles/:articleId/edit',
        handle: {customDashboardLayout: true},
        lazy: () =>
          import(
            '@app/help-center/articles/article-editor/update-article-page'
          ),
        loader: async ({params}) => {
          const redirect = authGuard({permission: 'articles.update'});
          if (redirect) return redirect;
          return await updateArticlePageLoader(params);
        },
      },

      // create article
      {
        path: 'sections/:sectionId/articles/new',
        handle: {customDashboardLayout: true},
        loader: () => authGuard({permission: 'articles.update'}) ?? null,
        lazy: () =>
          import(
            '@app/help-center/articles/article-editor/create-article-page'
          ),
      },
      {
        path: 'categories/:categoryId/articles/new',
        handle: {customDashboardLayout: true},
        loader: () => authGuard({permission: 'articles.update'}) ?? null,
        lazy: () =>
          import(
            '@app/help-center/articles/article-editor/create-article-page'
          ),
      },
    ],
  },
  ];
}

// Agents keep their existing Help Center routes and permissions.
export const hcManagerRoutes = createHcManagerRoutes('hc', '/agent/hc');
// Admins use the same pages inside the shared modern admin dashboard shell.
export const adminHcManagerRoutes = createHcManagerRoutes('help', '/admin/help');

import {helpCenterQueries} from '@app/help-center/help-center-queries';
import {authGuard} from '@common/auth/guards/auth-route';
import {shouldRevalidateDatatableLoader} from '@common/datatable/filters/utils/should-revalidate-datatable-loader';
import {queryClient} from '@common/http/query-client';
import {searchParamsFromUrl} from '@ui/utils/urls/search-params-from-url';
import {Navigate, Params, RouteObject} from 'react-router';

export const updateArticlePageLoader = async (params: Params) => {
  return await queryClient.ensureQueryData(
    helpCenterQueries.articles.getForUpdateArticlePage({
      articleId: params.articleId!,
      categoryId: params.categoryId,
      sectionId: params.sectionId,
    }),
  );
};

export function createHcManagerRoutes(prefix: 'hc' | 'help', root: string): RouteObject[] {
  return [
  // article datatable
  {
    path: prefix,
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
        loader: ({params}) =>
          Promise.allSettled([
            updateArticlePageLoader(params),
            queryClient.ensureQueryData(
              helpCenterQueries.categories.normalizedList(),
            ),
          ]),
      },
    ],
  },

  // help center manager
  {
    path: `${prefix}/arrange`,
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
        loader: async ({params}) => await updateArticlePageLoader(params),
      },
      {
        path: 'categories/:categoryId/articles/:articleId/edit',
        handle: {customDashboardLayout: true},
        lazy: () =>
          import(
            '@app/help-center/articles/article-editor/update-article-page'
          ),
        loader: async ({params}) => await updateArticlePageLoader(params),
      },

      // create article
      {
        path: 'sections/:sectionId/articles/new',
        handle: {customDashboardLayout: true},
        lazy: () =>
          import(
            '@app/help-center/articles/article-editor/create-article-page'
          ),
      },
      {
        path: 'categories/:categoryId/articles/new',
        handle: {customDashboardLayout: true},
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

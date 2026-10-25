import {NotFoundPage} from '@common/ui/not-found-page/not-found-page';
import {redirect, RouteObject} from 'react-router';
import {blogArticleOptions, blogCategoryOptions, blogIndexOptions} from '@common/blog/blog-queries';
import {queryClient} from '@common/http/query-client';
import {searchParamsFromUrl} from '@ui/utils/urls/search-params-from-url';

export const commonRoutes: RouteObject[] = [
  {
    path: 'contact',
    lazy: () => import('@common/contact/contact-us-page'),
  },
  // Legacy help/articles|categories/:slug are handled by Laravel
  // LegacyHelpRedirectController (slug-aware → /hc/...). Keep SPA fallback.
  {
    path: 'blog',
    lazy: () => import('@common/blog/blog-index-page'),
    loader: ({request}) => {
      const params = searchParamsFromUrl(request.url);
      return queryClient.ensureQueryData(
        blogIndexOptions(
          params.search as string | undefined,
          params.page ? Number(params.page) : undefined,
        ),
      );
    },
  },
  {
    path: 'blog/categories/:slug',
    lazy: () => import('@common/blog/blog-category-page'),
    loader: ({params, request}) => {
      const page = searchParamsFromUrl(request.url).page;
      return queryClient.ensureQueryData(
        blogCategoryOptions(params.slug!, page ? Number(page) : undefined),
      );
    },
  },
  {
    path: 'blog/:slug',
    lazy: () => import('@common/blog/blog-article-page'),
    loader: ({params}) =>
      queryClient.ensureQueryData(blogArticleOptions(params.slug!)),
  },
  {
    path: 'pages/:pageSlug',
    lazy: () => import('@common/custom-page/custom-page-layout'),
  },
  {
    path: 'pages/:pageId/:pageSlug',
    lazy: () => import('@common/custom-page/custom-page-layout'),
  },
  {
    path: '404',
    element: <NotFoundPage />,
  },
];

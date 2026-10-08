import {NotFoundPage} from '@common/ui/not-found-page/not-found-page';
import {RouteObject} from 'react-router';
import {helpArticleOptions, helpCategoryOptions, helpIndexOptions} from '@common/help/help-queries';
import {queryClient} from '@common/http/query-client';
import {searchParamsFromUrl} from '@ui/utils/urls/search-params-from-url';

export const commonRoutes: RouteObject[] = [
  {
    path: 'contact',
    lazy: () => import('@common/contact/contact-us-page'),
  },
  {
    path: 'help',
    lazy: () => import('@common/help/help-index-page'),
    loader: ({request}) =>
      queryClient.ensureQueryData(
        helpIndexOptions(searchParamsFromUrl(request.url).search as string | undefined),
      ),
  },
  {
    path: 'help/categories/:slug',
    lazy: () => import('@common/help/help-category-page'),
    loader: ({params}) =>
      queryClient.ensureQueryData(helpCategoryOptions(params.slug!)),
  },
  {
    path: 'help/articles/:slug',
    lazy: () => import('@common/help/help-article-page'),
    loader: ({params}) =>
      queryClient.ensureQueryData(helpArticleOptions(params.slug!)),
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

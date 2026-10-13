import {blogAdminQueries} from '@common/admin/blog/blog-admin-queries';
import {authGuard} from '@common/auth/guards/auth-route';
import {queryClient} from '@common/http/query-client';
import {RouteObject} from 'react-router';

/**
 * Blog management (Articles + Categories), mounted inside the admin settings
 * tree so it sits alongside the other content sections.
 */
export const adminBlogRoutes: RouteObject[] = [
  {
    path: 'blog',
    lazy: () => import('@common/admin/blog/blog-settings-page'),
    loader: async () => {
      const redirectTo = authGuard({permission: 'settings.update'});
      if (redirectTo) return redirectTo;
      await queryClient.ensureQueryData(blogAdminQueries.categoriesList());
    },
  },
];

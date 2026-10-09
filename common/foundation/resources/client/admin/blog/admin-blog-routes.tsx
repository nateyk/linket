import {RouteObject} from 'react-router';
import {BlogSettingsPage} from '@common/admin/blog/blog-settings-page';

export const adminBlogRoutes: RouteObject[] = [
  {
    path: 'blog',
    element: <BlogSettingsPage />,
  },
];
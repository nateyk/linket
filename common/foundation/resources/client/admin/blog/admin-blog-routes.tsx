import {RouteObject} from 'react-router';
import {Component as BlogSettingsPage} from '@common/admin/blog/blog-settings-page';

export const adminBlogRoutes: RouteObject[] = [
  {
    path: 'blog',
    element: <BlogSettingsPage />,
  },
];
import {
  listCustomPagesOptions,
  retrieveCustomPageOptions,
} from '@common/admin/custom-pages/custom-pages-queries';
import {authGuard} from '@common/auth/guards/auth-route';
import {queryClient} from '@common/http/query-client';
import {RouteObject} from 'react-router';

export const adminCustomPagesRoutes: Record<string, RouteObject> = {
  index: {
    path: 'custom-pages',
    lazy: () => import('@common/admin/custom-pages/custom-page-datable'),
    shouldRevalidate: () => false,
    loader: async () => {
      const redirect = authGuard({permission: 'custom_pages.update'});
      if (redirect) return redirect;
      await queryClient.ensureQueryData(listCustomPagesOptions());
    },
  },
  create: {
    path: 'custom-pages/new',
    loader: () => authGuard({permission: 'custom_pages.update'}),
    lazy: () => import('@common/admin/custom-pages/create-custom-page'),
  },
  update: {
    path: 'custom-pages/:pageId/edit',
    lazy: () => import('@common/admin/custom-pages/edit-custom-page'),
    loader: async ({params}) => {
      const redirect = authGuard({permission: 'custom_pages.update'});
      if (redirect) return redirect;
      await queryClient.ensureQueryData(
        retrieveCustomPageOptions(params.pageId!),
      );
    },
  },
};

import {
  listUsersForDatatableOptions,
  retrieveUserForEditPageOptions,
} from '@common/admin/users/users-queries';
import {authGuard} from '@common/auth/guards/auth-route';
import {queryClient} from '@common/http/query-client';
import {searchParamsFromUrl} from '@ui/utils/urls/search-params-from-url';
import {redirect, RouteObject} from 'react-router';
import {Fragment} from 'react/jsx-runtime';

export const adminUsersRoutes: Record<string, RouteObject> = {
  list: {
    path: 'users',
    lazy: () => import('@common/admin/users/users-datatable'),
    shouldRevalidate: () => false,
    loader: async ({request}) => {
      const redirect = authGuard({permission: 'users.update'});
      if (redirect) return redirect;
      await queryClient.ensureQueryData(
        listUsersForDatatableOptions(searchParamsFromUrl(request.url)),
      );
    },
  },
  update: {
    path: 'users/:userId',
    lazy: () => import('@common/admin/users/update-user-page/update-user-page'),
    shouldRevalidate: () => false,
    loader: async ({params}) => {
      const redirect = authGuard({permission: 'users.update'});
      if (redirect) return redirect;
      await queryClient.ensureQueryData(
        retrieveUserForEditPageOptions(Number(params.userId!)),
      );
    },
    children: [
      {
        index: true,
        loader: () => redirect('details'),
        element: <Fragment />,
      },
      {
        path: 'details',
        lazy: () =>
          import('@common/admin/users/update-user-page/update-user-details-tab'),
      },
      {
        path: 'permissions',
        lazy: () =>
          import('@common/admin/users/update-user-page/update-user-permissions-tab'),
      },
      {
        path: 'security',
        lazy: () =>
          import('@common/admin/users/update-user-page/update-user-security-tab'),
      },
      {
        path: 'date',
        lazy: () =>
          import('@common/admin/users/update-user-page/update-user-datetime-tab'),
      },
      {
        path: 'api',
        lazy: () =>
          import('@common/admin/users/update-user-page/update-user-api-tab'),
      },
    ],
  },
};

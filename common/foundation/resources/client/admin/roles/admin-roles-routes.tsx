import {
  listPermissionsOptions,
  listRolesOptions,
  listRoleUsersOptions,
  retrieveRoleOptions,
} from '@common/admin/roles/roles-queries';
import {authGuard} from '@common/auth/guards/auth-route';
import {queryClient} from '@common/http/query-client';
import {searchParamsFromUrl} from '@ui/utils/urls/search-params-from-url';
import {RouteObject} from 'react-router';

export const adminRolesRoutes: Record<string, RouteObject> = {
  list: {
    path: 'roles',
    lazy: () => import('@common/admin/roles/roles-datatable-page'),
    shouldRevalidate: () => false,
    loader: async () => {
      const redirect = authGuard({permission: 'roles.update'});
      if (redirect) return redirect;
      await queryClient.ensureQueryData(listRolesOptions());
    },
  },
  create: {
    path: 'roles/new',
    lazy: () => import('@common/admin/roles/create-role-page'),
    shouldRevalidate: () => false,
    loader: ({request}) => {
      const redirect = authGuard({permission: 'roles.update'});
      const searchParams = searchParamsFromUrl(request.url);
      if (redirect) return redirect;
      return queryClient.ensureQueryData(
        listPermissionsOptions(`${searchParams.type ?? 'users'}`),
      );
    },
  },
  update: {
    path: 'roles/:roleId/edit',
    shouldRevalidate: () => false,
    loader: async ({params, request}) => {
      const redirect = authGuard({permission: 'roles.update'});
      if (redirect) return redirect;

      const roleType = new URL(request.url).searchParams.get('type') ?? 'users';
      await Promise.all([
        queryClient.ensureQueryData(retrieveRoleOptions(Number(params.roleId))),
        queryClient.ensureQueryData(listPermissionsOptions(roleType)),
      ]);
    },
    lazy: async () => {
      const {UpdateRolePage} =
        await import('@common/admin/roles/update-role-page');
      return {Component: UpdateRolePage};
    },
    children: [
      {
        index: true,
        lazy: async () => {
          const {UpdateRoleSettingsTab} =
            await import('@common/admin/roles/update-role-page');
          return {Component: UpdateRoleSettingsTab};
        },
      },
      {
        path: 'users',
        shouldRevalidate: () => false,
        loader: ({params, request}) =>
          queryClient.ensureQueryData(
            listRoleUsersOptions(
              Number(params.roleId),
              searchParamsFromUrl(request.url),
            ),
          ),
        lazy: () => import('@common/admin/roles/role-users-datatable'),
      },
    ],
  },
};

import {
  addUsersToRole,
  createRole,
  deleteRole,
  exportRolesCsv,
  listPermissions,
  listRoles,
  listRoleUsers,
  removeUsersFromRole,
  retrieveRole,
  updateRole,
} from '@app/gen/roles';
import {usersBaseKey} from '@common/admin/users/users-queries';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {FirstParam, SecondParam} from '@ui/utils/ts/extract-params';

export const rolesBaseKey = ['roles'];

export const listRolesOptions = (params?: FirstParam<typeof listRoles>) => {
  return queryOptions({
    queryKey: [...rolesBaseKey, params],
    queryFn: () => listRoles(params),
  });
};

export const retrieveRoleOptions = (id: number) => {
  return queryOptions({
    queryKey: [...rolesBaseKey, `${id}`],
    queryFn: () => retrieveRole(id),
  });
};

export const listPermissionsOptions = (roleType: string) => {
  return queryOptions({
    queryKey: [...rolesBaseKey, 'permissions', roleType],
    queryFn: () => listPermissions({roleType}),
  });
};

export const createRoleOptions = () => {
  return mutationOptions({
    mutationFn: (body: FirstParam<typeof createRole>) => createRole(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: rolesBaseKey,
      });
    },
  });
};

export const updateRoleOptions = (roleId: number) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof updateRole>) =>
      updateRole(roleId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: rolesBaseKey,
      });
    },
  });
};

export const deleteRoleOptions = mutationOptions({
  mutationFn: (roleId: number) => deleteRole(roleId),
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: rolesBaseKey,
    });
  },
});

export const listRoleUsersOptions = (
  roleId: number,
  params: SecondParam<typeof listRoleUsers>,
) => {
  return queryOptions({
    queryKey: [...rolesBaseKey, `${roleId}`, 'users'],
    queryFn: () => listRoleUsers(roleId, params),
  });
};

export const addUsersToRoleOptions = (roleId: number) => {
  return mutationOptions({
    mutationFn: (userIds: number[]) => addUsersToRole(roleId, {userIds}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: rolesBaseKey});
      queryClient.invalidateQueries({queryKey: usersBaseKey});
    },
  });
};

export const removeUsersFromRoleOptions = (roleId: number) => {
  return mutationOptions({
    mutationFn: (userIds: number[]) => removeUsersFromRole(roleId, {userIds}),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: rolesBaseKey});
      queryClient.invalidateQueries({queryKey: usersBaseKey});
    },
  });
};

export const exportRolesCsvOptions = () => {
  return mutationOptions({
    mutationFn: () => exportRolesCsv(),
  });
};

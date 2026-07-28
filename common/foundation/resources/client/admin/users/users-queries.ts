import {ListUsersParams} from '@app/gen/schemas/list-users-params';
import {Role} from '@app/gen/schemas/role';
import {UpdateUserBody} from '@app/gen/schemas/update-user-body';
import {
  banUsers,
  createUser,
  deleteUsers,
  exportUsersCsv,
  impersonateUser,
  listUsers,
  retrieveUser,
  unbanUsers,
  updateUser,
} from '@app/gen/users';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {FirstParam, SecondParam} from '@ui/utils/ts/extract-params';

export const usersBaseKey = ['users'];

export const listUsersForDatatableOptions = (params: ListUsersParams) =>
  listUsersOptions({
    ...{fields_preset: 'users_datatable'},
    ...params,
  });

export const listUsersOptions = (params: ListUsersParams) =>
  queryOptions({
    queryKey: [...usersBaseKey, 'datatable', params],
    queryFn: () => listUsers(params),
  });

export const retrieveUserForEditPageOptions = (id: number) =>
  retrieveUserOptions(id, {fields_preset: 'update_user'});

export const retrieveUserOptions = (
  id: number,
  params?: SecondParam<typeof retrieveUser>,
) => {
  const queryKey: any[] = [...usersBaseKey, `${id}`];
  if (params) {
    queryKey.push(params);
  }
  return queryOptions({
    queryKey,
    queryFn: () => retrieveUser(id, params),
  });
};

export const createUserOptions = () => {
  return mutationOptions({
    mutationFn: (payload: FirstParam<typeof createUser>) => createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: usersBaseKey,
      });
    },
  });
};

export type UpdateUserFormValue = {
  roles?: Role[];
} & Omit<UpdateUserBody, 'roles'>;

export const updateUserOptions = (userId: number) => {
  return mutationOptions({
    mutationFn: (formValue: UpdateUserFormValue) =>
      updateUser(userId, {
        ...formValue,
        roles: formValue.roles?.map(role => role.id),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: usersBaseKey,
      });
    },
  });
};

export const deleteUsersOptions = mutationOptions({
  mutationFn: (userIds: (number | string)[]) =>
    deleteUsers({userIds: userIds.join(',')}),
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: usersBaseKey,
    });
  },
});

export const banUsersOptions = (userIds: (number | string)[]) => {
  return mutationOptions({
    mutationFn: (payload: SecondParam<typeof banUsers>) =>
      banUsers(userIds.join(','), payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: usersBaseKey,
      });
    },
  });
};

export const unbanUsersOptions = mutationOptions({
  mutationFn: (userIds: (number | string)[]) => unbanUsers(userIds.join(',')),
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: usersBaseKey,
    });
  },
});

export const impersonateUserOptions = mutationOptions({
  mutationFn: (userId: number) => impersonateUser(userId),
  onSuccess: () => {
    window.location.href = '/';
  },
});

export const exportUsersCsvOptions = () => {
  return mutationOptions({
    mutationFn: () => exportUsersCsv(),
  });
};

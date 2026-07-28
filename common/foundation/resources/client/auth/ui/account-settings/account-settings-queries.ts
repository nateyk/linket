import {
  createAccessToken,
  deleteAccessToken,
  getAccountSettings,
  listUserSessions,
  logoutOtherSessions,
} from '@app/gen/account';
import {updateUser} from '@app/gen/users';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {FirstParam, SecondParam} from '@ui/utils/ts/extract-params';

export const baseAccountSettingsKey = ['users', 'me'];

export const getAccountSettingsOptions = () =>
  queryOptions({
    queryKey: [...baseAccountSettingsKey, 'account-settings'],
    queryFn: () => getAccountSettings(),
  });

export const listUserSessionsOptions = () =>
  queryOptions({
    queryKey: [...baseAccountSettingsKey, 'user-sessions'],
    queryFn: () => listUserSessions(),
  });

export const updateDetailsOptions = (userId: number) =>
  mutationOptions({
    mutationFn: (payload: SecondParam<typeof updateUser>) =>
      updateUser(userId, payload),
  });

export const logoutOtherSessionsOptions = () =>
  mutationOptions({
    mutationFn: (payload: FirstParam<typeof logoutOtherSessions>) =>
      logoutOtherSessions(payload),
  });

export const createAccessTokenOptions = () =>
  mutationOptions({
    mutationFn: (payload: FirstParam<typeof createAccessToken>) =>
      createAccessToken(payload),
    onSuccess: () => queryClient.invalidateQueries({queryKey: ['users']}),
  });

export const deleteAccessTokenOptions = (tokenId: number) =>
  mutationOptions({
    mutationFn: () => deleteAccessToken(tokenId),
    onSuccess: () => queryClient.invalidateQueries({queryKey: ['users']}),
  });

import {
  getPasswordConfirmationStatusOptions,
  setPasswordConfirmationStatus,
} from '@common/auth/auth-queries';
import {ConfirmPasswordDialogContext} from '@common/auth/ui/confirm-password/confirm-password-dialog';
import {useQuery} from '@tanstack/react-query';
import {use, useCallback} from 'react';

let confirmedPassword: string | null = null;

export function usePasswordConfirmedAction() {
  const {data, isLoading} = useQuery(getPasswordConfirmationStatusOptions());

  const {open} = use(ConfirmPasswordDialogContext);

  const withConfirmedPassword = useCallback(
    async (action: (password: string) => void) => {
      if (data?.confirmed && confirmedPassword) {
        action(confirmedPassword);
      } else {
        const password = await open();
        if (password) {
          confirmedPassword = password;
          setPasswordConfirmationStatus(true);
          action(confirmedPassword);
        }
      }
    },
    [data?.confirmed, open],
  );

  return {
    isLoading,
    withConfirmedPassword,
  };
}

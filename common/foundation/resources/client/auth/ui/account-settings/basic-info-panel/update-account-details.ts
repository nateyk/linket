import {updateDetailsOptions} from '@common/auth/ui/account-settings/account-settings-queries';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {useMutation} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {toast} from '@ui/toast/toast';
import {User} from '@ui/types/user';
import {UseFormReturn} from 'react-hook-form';

interface Payload {
  name?: string;
  image?: string | null;
  image_entry_id?: number | null;
}

export function useUpdateAccountDetails(
  userId: number,
  form?: UseFormReturn<Partial<User> & {image_entry_id?: string | null}>,
) {
  const options = updateDetailsOptions(userId);
  return useMutation({
    mutationFn: (payload: Payload) =>
      (options.mutationFn as (p: Payload) => Promise<unknown>)(payload),
    onSuccess: () => {
      toast(message('Updated account details'));
    },
    onError: r => (form ? onFormQueryError(r, form) : showHttpErrorToast(r)),
  });
}

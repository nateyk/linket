import {User} from '@app/gen/schemas/user';
import {DirtyFormSaveDrawer} from '@common/admin/crupdate-resource-layout';
import {
  UpdateUserFormValue,
  updateUserOptions,
} from '@common/admin/users/users-queries';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ReactNode} from 'react';
import {UseFormReturn} from 'react-hook-form';
import {useNavigate, useOutletContext} from 'react-router';

interface Props {
  form: UseFormReturn<UpdateUserFormValue>;
  children: ReactNode;
}
export function UpdateUserForm({form, children}: Props) {
  const navigate = useNavigate();
  const user = useOutletContext() as User;
  const updateUser = useMutation(updateUserOptions(user.id));

  const handleSubmit = (values: UpdateUserFormValue) => {
    updateUser.mutate(values, {
      onSuccess: () => {
        toast.success(<Trans message="User updated" />);
        navigate('../..', {relative: 'path'});
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      {children}
      <DirtyFormSaveDrawer isLoading={updateUser.isPending} />
    </HookForm.Root>
  );
}

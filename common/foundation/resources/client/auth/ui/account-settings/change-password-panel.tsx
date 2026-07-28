import {
  updatePasswordOptions,
  UpdatePasswordPayload,
} from '@common/auth/auth-queries';
import {AccountSettingsPanel} from '@common/auth/ui/account-settings/account-settings-panel';
import {AccountSettingsId} from '@common/auth/ui/account-settings/account-settings-sidenav';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useId} from 'react';
import {useForm} from 'react-hook-form';

export function ChangePasswordPanel() {
  const form = useForm<UpdatePasswordPayload>();
  const formId = useId();
  const updatePassword = useMutation(updatePasswordOptions());

  const handleUpdatePassword = (value: UpdatePasswordPayload) => {
    updatePassword.mutate(value, {
      onSuccess: () => {
        toast.success(<Trans message="Password changed" />);
        form.reset();
      },
      onError: r => onFormQueryError(r, form),
    });
  };

  return (
    <AccountSettingsPanel
      id={AccountSettingsId.Password}
      title={<Trans message="Update password" />}
      actions={
        <Button
          type="submit"
          form={formId}
          variant="default"
          color="primary"
          size="sm"
          disabled={!form.formState.isValid || updatePassword.isPending}
        >
          <Trans message="Update password" />
        </Button>
      }
    >
      <HookForm.Root form={form} id={formId} onSubmit={handleUpdatePassword}>
        <Field.Group>
          <HookForm.Field name="current_password">
            <Field.Label>
              <Trans message="Current password" />
            </Field.Label>
            <Input type="password" autoComplete="current-password" required />
            <Field.Error />
          </HookForm.Field>
          <HookForm.Field name="password">
            <Field.Label>
              <Trans message="New password" />
            </Field.Label>
            <Input type="password" autoComplete="new-password" required />
            <Field.Error />
          </HookForm.Field>
          <HookForm.Field name="password_confirmation">
            <Field.Label>
              <Trans message="Confirm password" />
            </Field.Label>
            <Input type="password" autoComplete="new-password" required />
            <Field.Error />
          </HookForm.Field>
        </Field.Group>
      </HookForm.Root>
    </AccountSettingsPanel>
  );
}

import {User} from '@app/gen/schemas/user';
import {UpdateUserForm} from '@common/admin/users/update-user-page/update-user-form';
import {UserRoleCombobox} from '@common/admin/users/update-user-page/user-role-combobox';
import {UpdateUserFormValue} from '@common/admin/users/users-queries';
import {resendVerificationEmailOptions} from '@common/auth/auth-queries';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Switch} from '@shadcn/forms/switch/switch';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {useForm} from 'react-hook-form';
import {useOutletContext} from 'react-router';

export function Component() {
  const user = useOutletContext() as User;
  const form = useForm<UpdateUserFormValue>({
    defaultValues: {
      name: user.name ?? '',
      roles: user.roles,
      email_is_verified: !!user.email_verified_at,
    },
  });

  return (
    <UpdateUserForm form={form}>
      <Field.Group>
        <HookForm.Field name="name">
          <Field.Label>
            <Trans message="Name" />
          </Field.Label>
          <Input />
          <Field.Error />
        </HookForm.Field>
        <EmailConfirmSection user={user} />
        <UserRoleCombobox />
      </Field.Group>
    </UpdateUserForm>
  );
}

function EmailConfirmSection({user}: {user: User}) {
  const {require_email_confirmation} = useSettings();
  const resendConfirmationEmail = useMutation(resendVerificationEmailOptions());
  const handleResendConfirmationEmail = (email: string) => {
    resendConfirmationEmail.mutate(
      {email},
      {
        onSuccess: () => {
          toast.success(<Trans message="Email sent" />);
        },
        onError: err => showHttpErrorToast(err),
      },
    );
  };

  return (
    <Field.Group>
      <HookForm.Field name="email_is_verified">
        <Field.Label>
          <Switch disabled={!require_email_confirmation} />
          <Trans message="Email confirmed" />
        </Field.Label>
        <Field.Description>
          <Trans message="Whether email address has been confirmed. User will not be able to login until address is confirmed, unless confirmation is disabled from settings page." />
        </Field.Description>
        <Field.Error />
      </HookForm.Field>
      <div>
        <Button
          size="sm"
          variant="outline"
          color="primary"
          disabled={
            !require_email_confirmation ||
            resendConfirmationEmail.isPending ||
            !!user.email_verified_at
          }
          onClick={() => handleResendConfirmationEmail(user.email)}
        >
          <Trans message="Resend email" />
        </Button>
      </div>
    </Field.Group>
  );
}

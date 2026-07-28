import {
  resetPasswordOptions,
  ResetPasswordPayload,
} from '@common/auth/auth-queries';
import {GuestRoute} from '@common/auth/guards/guest-route';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {LinkStyle} from '@ui/buttons/external-link';
import {Trans} from '@ui/i18n/trans';
import {useForm} from 'react-hook-form';
import {Link, useNavigate, useParams} from 'react-router';
import {StaticPageTitle} from '../../seo/static-page-title';
import {AuthLayout} from './auth-layout/auth-layout';

export function Component() {
  const {token} = useParams();
  const navigate = useNavigate();
  const form = useForm<ResetPasswordPayload>({defaultValues: {token}});
  const resetPassword = useMutation(resetPasswordOptions());

  const handleResetPassword = (payload: ResetPasswordPayload) => {
    resetPassword.mutate(payload, {
      onSuccess: () => {
        navigate('/login', {replace: true});
        toast.success(<Trans message="Your password has been reset!" />);
      },
    });
  };

  const message = (
    <Trans
      values={{
        a: parts => (
          <Link className={LinkStyle} to="/register">
            {parts}
          </Link>
        ),
      }}
      message="Don't have an account? <a>Sign up.</a>"
    />
  );

  return (
    <GuestRoute>
      <AuthLayout
        heading={<Trans message="Reset your account password" />}
        message={message}
      >
        <StaticPageTitle>
          <Trans message="Reset Password" />
        </StaticPageTitle>
        <HookForm.Root form={form} onSubmit={handleResetPassword}>
          <Field.Group>
            <HookForm.Field name="email">
              <Field.Label>
                <Trans message="Email" />
              </Field.Label>
              <Input type="email" required />
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field name="password">
              <Field.Label>
                <Trans message="New password" />
              </Field.Label>
              <Input type="password" required />
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field name="password_confirmation">
              <Field.Label>
                <Trans message="Confirm password" />
              </Field.Label>
              <Input type="password" required />
              <Field.Error />
            </HookForm.Field>

            <Button
              className="w-full"
              type="submit"
              variant="default"
              color="primary"
              disabled={resetPassword.isPending}
            >
              <Trans message="Reset password" />
            </Button>
          </Field.Group>
        </HookForm.Root>
      </AuthLayout>
    </GuestRoute>
  );
}

import {sendResetPasswordEmailOptions} from '@common/auth/auth-queries';
import {GuestRoute} from '@common/auth/guards/guest-route';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {LinkStyle} from '@ui/buttons/external-link';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {useForm} from 'react-hook-form';
import {Link, useNavigate, useSearchParams} from 'react-router';
import {StaticPageTitle} from '../../seo/static-page-title';
import {AuthLayout} from './auth-layout/auth-layout';

export function Component() {
  const {registration} = useSettings();
  const navigate = useNavigate();

  const [searchParams] = useSearchParams();
  const searchParamsEmail = searchParams.get('email') || undefined;

  const form = useForm<{email: string}>({
    defaultValues: {email: searchParamsEmail},
  });

  const sendEmail = useMutation(sendResetPasswordEmailOptions());
  const handleSendEmail = (payload: {email: string}) => {
    sendEmail.mutate(payload, {
      onSuccess: ({message}) => {
        toast.success(message);
        navigate('/login');
      },
      onError: r => onFormQueryError(r, form),
    });
  };

  const message = !registration?.disable && (
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
      <AuthLayout message={message}>
        <StaticPageTitle>
          <Trans message="Forgot Password" />
        </StaticPageTitle>
        <HookForm.Root form={form} onSubmit={handleSendEmail}>
          <Field.Group>
            <div className="text-sm">
              <Trans message="Enter your email address below and we will send you a link to reset or create your password." />
            </div>

            <HookForm.Field name="email">
              <Field.Label>
                <Trans message="Email" />
              </Field.Label>
              <Input
                type="email"
                required
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
              <Field.Error />
            </HookForm.Field>

            <Button
              className="w-full"
              type="submit"
              variant="default"
              color="primary"
              disabled={sendEmail.isPending}
            >
              <Trans message="Continue" />
            </Button>
          </Field.Group>
        </HookForm.Root>
      </AuthLayout>
    </GuestRoute>
  );
}

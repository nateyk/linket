import {retrieveUserOptions} from '@common/admin/users/users-queries';
import {
  resendVerificationEmailOptions,
  validateEmailVerificationOtpOptions,
} from '@common/auth/auth-queries';
import {useLogout} from '@common/auth/requests/use-logout';
import {auth} from '@common/auth/use-auth';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {Logo} from '@common/ui/navigation/navbar/logo';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {ChevronLeftIcon} from 'lucide-react';
import {useForm} from 'react-hook-form';

export function Component() {
  const {trans} = useTrans();
  const {data} = useSuspenseQuery(retrieveUserOptions(auth.user!.id));
  const user = data.data;
  const logout = useLogout();

  const form = useForm<{code: string}>();

  const validateOtp = useMutation(validateEmailVerificationOtpOptions());
  const handleValidateOtp = (values: {code: string}) => {
    validateOtp.mutate(values, {
      onSuccess: () => {
        window.location.reload();
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  const resendEmail = useMutation(resendVerificationEmailOptions());
  const handleResendEmail = (email: string) => {
    resendEmail.mutate(
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
    <div className="flex min-h-screen w-screen bg-muted p-6">
      <div className="mx-auto mt-10 max-w-110">
        <Button
          variant="outline"
          onClick={() => logout.mutate()}
          size="sm"
          className="mr-auto mb-13.5"
        >
          <ChevronLeftIcon />
          <Trans message="Logout" />
        </Button>

        <Logo className="mx-auto mb-11 block max-h-10.5 w-auto" />

        <div className="text-center">
          <h1 className="mb-6 text-3xl">
            <Trans message="Verify your email" />
          </h1>

          <h2 className="text-lg">
            <Trans
              message="Enter the verification code we sent to :email"
              values={{email: maskEmailAddress(user.email)}}
            />
          </h2>

          <HookForm.Root
            form={form}
            onSubmit={handleValidateOtp}
            className="my-4"
          >
            <HookForm.Field name="code">
              <Field.Label>
                <Trans message="Code" />
              </Field.Label>
              <Input
                type="text"
                placeholder={trans(message('Enter your verification code'))}
                autoFocus
                autoComplete="one-time-code"
                autoCorrect="off"
                autoCapitalize="off"
                maxLength={6}
                inputMode="numeric"
                required
              />
              <Field.Error />
            </HookForm.Field>

            <Button
              type="submit"
              variant="default"
              color="primary"
              className="mt-6 w-full"
              disabled={validateOtp.isPending}
            >
              <Trans message="Next" />
            </Button>
          </HookForm.Root>
          <div className="mb-6 text-sm">
            <Trans
              message="If you don't see the email in your inbox, check your spam folder and promotions tab. If you still don't see it, <a>request a resend</a>."
              values={{
                a: text => (
                  <button
                    className="text-primary hover:underline"
                    disabled={resendEmail.isPending || !user.email}
                    onClick={() => handleResendEmail(user.email)}
                  >
                    {text}
                  </button>
                ),
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function maskEmailAddress(email: string | undefined) {
  if (!email) return '*******************';
  const [username = '', domain] = email.split('@');
  return `${username.slice(0, 2)}****@${domain}`;
}

import {GuestRoute} from '@common/auth/guards/guest-route';
import {CaptchaContainer} from '@common/captcha/captcha-container';
import {Button} from '@shadcn/button/button';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {LinkStyle} from '@ui/buttons/external-link';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {toast} from '@ui/toast/toast';
import {ReactNode} from 'react';
import {useForm} from 'react-hook-form';
import {Link, Navigate, useLocation, useSearchParams} from 'react-router';
import {useCaptcha} from '../../captcha/use-captcha';
import {UnstyledCustomMenuItem} from '../../menus/custom-menu';
import {StaticPageTitle} from '../../seo/static-page-title';
import {RegisterPayload, useRegister} from '../requests/use-register';
import {AuthLayoutV2} from './auth-layout/auth-layout-v2';
import {SocialAuthSection} from './social-auth-section';

interface Props {
  inviteType?: string;
  fields?: ReactNode;
  children?: ReactNode;
}
export function RegisterPage({inviteType, fields, children}: Props) {
  const {branding, registration} = useSettings();
  const {captchaToken, captchaEnabled, resetCaptcha} = useCaptcha('register');

  const {pathname} = useLocation();
  const [searchParams] = useSearchParams();

  const isRegisteringUsingInvite =
    pathname.includes('workspace') || !!inviteType;
  const isBillingRegister = searchParams.get('redirectFrom') === 'pricing';
  const searchParamsEmail = searchParams.get('email') || undefined;

  const form = useForm<RegisterPayload>({
    defaultValues: {email: searchParamsEmail},
  });
  const register = useRegister(form);

  if (registration?.disable && !isRegisteringUsingInvite) {
    return <Navigate to="/login" replace />;
  }

  let heading = <Trans message="Create a new account" />;
  if (isRegisteringUsingInvite) {
    heading = (
      <Trans
        values={{siteName: branding?.site_name}}
        message="To join your team on :siteName, create an account"
      />
    );
  } else if (isBillingRegister) {
    heading = <Trans message="First, let's create your account" />;
  }

  const footerMessage = (
    <Trans
      values={{
        a: parts => (
          <Link
            className={`${LinkStyle} inline-flex min-h-6 items-center`}
            to="/login"
          >
            {parts}
          </Link>
        ),
      }}
      message="Already have an account? <a>Sign in.</a>"
    />
  );

  return (
    <GuestRoute>
      <AuthLayoutV2>
        {children}
        <StaticPageTitle>
          <Trans message="Register" />
        </StaticPageTitle>

        <div className="space-y-2 text-center">
          <h1 className="font-medium text-3xl">{heading}</h1>
          <p className="text-sm text-muted-foreground">
            {isRegisteringUsingInvite || isBillingRegister ? null : (
              <Trans message="Please enter your details to create an account." />
            )}
          </p>
        </div>

        <div className="space-y-4">
          <SocialAuthSection
            isUsingInvite={isRegisteringUsingInvite}
            dividerMessage={<Trans message="Or continue with" />}
          />

          <HookForm.Root
            form={form}
            onSubmit={async payload => {
              if (captchaEnabled && !captchaToken) {
                toast.danger(message('Please solve the captcha challenge.'));
                return;
              }
              register.mutate(
                {
                  ...payload,
                  captcha_token: captchaToken,
                  invite_type: inviteType,
                  registration_data: searchParams.get('data') ?? null,
                },
                {onError: () => resetCaptcha()},
              );
            }}
          >
            <Field.Group className="gap-4">
              <HookForm.Field name="email" disabled={!!searchParamsEmail}>
                <Field.Label htmlFor="register-email">
                  <Trans message="Email Address" />
                </Field.Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
                <Field.Error />
              </HookForm.Field>

              <HookForm.Field name="password">
                <Field.Label htmlFor="register-password">
                  <Trans message="Password" />
                </Field.Label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
                <Field.Error />
              </HookForm.Field>

              <HookForm.Field name="password_confirmation">
                <Field.Label htmlFor="register-password-confirmation">
                  <Trans message="Confirm password" />
                </Field.Label>
                <Input
                  id="register-password-confirmation"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />
                <Field.Error />
              </HookForm.Field>

              {fields}
              {captchaEnabled && <CaptchaContainer className="mb-8" />}
              <PolicyCheckboxes />
              <Button
                className="w-full"
                type="submit"
                variant="default"
                color="primary"
                disabled={register.isPending}
              >
                <Trans message="Create account" />
              </Button>
            </Field.Group>
          </HookForm.Root>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          {footerMessage}
        </div>
      </AuthLayoutV2>
    </GuestRoute>
  );
}

function PolicyCheckboxes() {
  const {registration} = useSettings();

  if (!registration?.policies) return null;

  return (
    <div className="flex flex-col gap-2">
      {registration.policies.map(policy => (
        <HookForm.Field name={policy.id} key={policy.id}>
          <Field.Label>
            <Checkbox required />
            <span>
              <Trans
                message="I accept the :name"
                values={{
                  name: (
                    <UnstyledCustomMenuItem
                      className="text-primary hover:underline"
                      item={policy}
                    />
                  ),
                }}
              />
            </span>
          </Field.Label>
          <Field.Error />
        </HookForm.Field>
      ))}
    </div>
  );
}

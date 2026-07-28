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
import {AuthLayout} from './auth-layout/auth-layout';
import {SocialAuthSection} from './social-auth-section';

interface Props {
  inviteType?: string;
  fields?: ReactNode;
  children?: ReactNode;
}
export function RegisterPage({inviteType, fields, children}: Props) {
  const {branding, registration, social} = useSettings();
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
          <Link className={LinkStyle} to="/login">
            {parts}
          </Link>
        ),
      }}
      message="Already have an account? <a>Sign in.</a>"
    />
  );

  return (
    <GuestRoute>
      <AuthLayout heading={heading} message={footerMessage}>
        {children}
        <StaticPageTitle>
          <Trans message="Register" />
        </StaticPageTitle>
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
          <Field.Group>
            <HookForm.Field name="email" disabled={!!searchParamsEmail}>
              <Field.Label>
                <Trans message="Email" />
              </Field.Label>
              <Input type="email" required />
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field name="password">
              <Field.Label>
                <Trans message="Password" />
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

            {fields}
            {captchaEnabled && <CaptchaContainer className="mb-8" />}
            <PolicyCheckboxes />
            <Button
              className="mt-2 w-full"
              type="submit"
              variant="default"
              color="primary"
              disabled={register.isPending}
            >
              <Trans message="Create account" />
            </Button>
          </Field.Group>

          <SocialAuthSection
            isUsingInvite={isRegisteringUsingInvite}
            dividerMessage={
              social?.compact_buttons ? (
                <Trans message="Or sign up with" />
              ) : (
                <Trans message="OR" />
              )
            }
          />
        </HookForm.Root>
      </AuthLayout>
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

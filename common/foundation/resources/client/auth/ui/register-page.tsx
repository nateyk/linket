import {GuestRoute} from '@common/auth/guards/guest-route';
import {CaptchaContainer} from '@common/captcha/captcha-container';
import {Button} from '@shadcn/button/button';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@shadcn/forms/input-group/input-group';
import {Input} from '@shadcn/forms/input/input';
import {Spinner} from '@shadcn/spinner/spinner';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {useSettings} from '@ui/settings/use-settings';
import {toast} from '@ui/toast/toast';
import {EyeIcon, EyeOffIcon} from 'lucide-react';
import {ReactNode, useState} from 'react';
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
  const {trans} = useTrans();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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

  const signinPrompt = (
    <p className="text-sm text-muted-foreground">
      <Trans
        values={{
          a: parts => (
            <Link
              className="font-medium text-primary hover:underline"
              to="/login"
            >
              {parts}
            </Link>
          ),
        }}
        message="Already have an account? <a>Sign in</a>"
      />
    </p>
  );

  return (
    <GuestRoute>
      <AuthLayoutV2>
        {children}
        <StaticPageTitle>
          <Trans message="Register" />
        </StaticPageTitle>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {heading}
          </h1>
          {signinPrompt}
        </div>

        <div className="flex flex-col gap-5">
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
              <HookForm.Field name="email" className="gap-1.5" disabled={!!searchParamsEmail}>
                <Field.Label htmlFor="register-email">
                  <Trans message="Email Address" />
                </Field.Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-10"
                  required
                />
                <Field.Error />
              </HookForm.Field>

              <HookForm.Field name="password" className="gap-1.5">
                <Field.Label htmlFor="register-password">
                  <Trans message="Password" />
                </Field.Label>
                <InputGroup className="h-10">
                  <InputGroupInput
                    id="register-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-xs"
                      aria-label={trans(
                        showPassword
                          ? message('Hide password')
                          : message('Show password'),
                      )}
                      aria-pressed={showPassword}
                      onClick={() => setShowPassword(value => !value)}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <Field.Error />
              </HookForm.Field>

              <HookForm.Field name="password_confirmation" className="gap-1.5">
                <Field.Label htmlFor="register-password-confirmation">
                  <Trans message="Confirm password" />
                </Field.Label>
                <InputGroup className="h-10">
                  <InputGroupInput
                    id="register-password-confirmation"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    required
                  />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-xs"
                      aria-label={trans(
                        showConfirmPassword
                          ? message('Hide confirm password')
                          : message('Show confirm password'),
                      )}
                      aria-pressed={showConfirmPassword}
                      onClick={() => setShowConfirmPassword(value => !value)}
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
                <Field.Error />
              </HookForm.Field>

              {fields}
              {captchaEnabled && <CaptchaContainer className="mb-8" />}
              <PolicyCheckboxes />
              <Button
                className="w-full"
                size="lg"
                type="submit"
                variant="default"
                color="primary"
                disabled={register.isPending}
              >
                {register.isPending && <Spinner data-icon="inline-start" />}
                <Trans message="Create account" />
              </Button>
            </Field.Group>
          </HookForm.Root>
          <SocialAuthSection
            isUsingInvite={isRegisteringUsingInvite}
            dividerMessage={<Trans message="or" />}
          />
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

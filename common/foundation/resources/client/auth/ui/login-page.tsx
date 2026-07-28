import {LoginPayload} from '@common/auth/auth-queries';
import {Button} from '@shadcn/button/button';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {LinkStyle} from '@ui/buttons/external-link';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {ReactNode, useContext} from 'react';
import {useForm} from 'react-hook-form';
import {Link, useLocation, useSearchParams} from 'react-router';
import {
  SiteConfigContext,
  SiteConfigContextValue,
} from '../../core/settings/site-config-context';
import {StaticPageTitle} from '../../seo/static-page-title';
import {useLogin} from '../requests/use-login';
import {AuthLayout} from './auth-layout/auth-layout';
import {SocialAuthSection} from './social-auth-section';

interface Props {
  onTwoFactorChallenge: () => void;
  bottomMessages?: ReactNode;
  children?: ReactNode;
}
export function LoginPage({
  onTwoFactorChallenge,
  bottomMessages,
  children,
}: Props) {
  const [searchParams] = useSearchParams();
  const {pathname} = useLocation();

  const isWorkspaceLogin = pathname.includes('workspace');
  const searchParamsEmail = searchParams.get('email') || undefined;

  const {branding, registration, site, social} = useSettings();
  const registrationEnabled = !registration?.disable;
  const siteConfig = useContext(SiteConfigContext);

  const demoDefaults =
    site.demo && !searchParamsEmail ? getDemoFormDefaults(siteConfig) : {};
  const form = useForm<LoginPayload>({
    defaultValues: {remember: true, email: searchParamsEmail, ...demoDefaults},
  });
  const login = useLogin(form);

  const heading = isWorkspaceLogin ? (
    <Trans
      values={{siteName: branding?.site_name}}
      message="To join your team on :siteName, login to your account"
    />
  ) : (
    <Trans message="Sign in to your account" />
  );

  const messages = (registrationEnabled || bottomMessages) && (
    <div className="flex flex-col gap-2">
      {registrationEnabled && (
        <div>
          <Trans
            message="Don't have an account? <a>Sign up.</a>"
            values={{
              a: parts => (
                <Link className={LinkStyle} to="/register">
                  {parts}
                </Link>
              ),
            }}
          />
        </div>
      )}
      {bottomMessages}
    </div>
  );

  const isInvalid = !!Object.keys(form.formState.errors).length;

  return (
    <AuthLayout heading={heading} message={messages}>
      <StaticPageTitle>
        <Trans message="Login" />
      </StaticPageTitle>

      {children}

      <HookForm.Root
        form={form}
        onSubmit={payload => {
          login.mutate(payload, {
            onSuccess: response => {
              if (response.two_factor) {
                onTwoFactorChallenge();
              }
            },
          });
        }}
      >
        <Field.Group>
          <HookForm.Field
            name="email"
            invalid={isInvalid ? true : undefined}
            disabled={!!searchParamsEmail}
          >
            <Field.Label>
              <Trans message="Email" />
            </Field.Label>
            <Input type="email" required />
            {form.formState.errors.email?.message ? (
              <Field.Error>
                <InvalidCredentialsMessage />
              </Field.Error>
            ) : (
              <Field.Error />
            )}
          </HookForm.Field>

          <HookForm.Field
            name="password"
            invalid={isInvalid ? true : undefined}
          >
            <div className="flex items-center justify-between gap-4">
              <Field.Label>
                <Trans message="Password" />
              </Field.Label>
              <Link
                className="text-sm hover:underline"
                to="/forgot-password"
                tabIndex={-1}
              >
                <Trans message="Forgot your password?" />
              </Link>
            </div>
            <Input type="password" required />
            <Field.Error />
          </HookForm.Field>

          <HookForm.Field name="remember">
            <Field.Label>
              <Checkbox />
              <Trans message="Stay signed in for a month" />
            </Field.Label>
          </HookForm.Field>

          <Button
            className="mt-2 w-full"
            type="submit"
            variant="default"
            color="primary"
            disabled={login.isPending}
          >
            <Trans message="Continue" />
          </Button>
        </Field.Group>
      </HookForm.Root>
      <SocialAuthSection
        dividerMessage={
          social?.compact_buttons ? (
            <Trans message="Or sign in with" />
          ) : (
            <Trans message="OR" />
          )
        }
      />
    </AuthLayout>
  );
}

function InvalidCredentialsMessage() {
  return (
    <Trans
      message="These credentials do not match our records. Try again or <a>get a new password</a>."
      values={{
        a: text => (
          <Link
            className="font-semibold underline"
            to="/forgot-password"
            tabIndex={-1}
          >
            {text}
          </Link>
        ),
      }}
    />
  );
}

function getDemoFormDefaults(siteConfig: SiteConfigContextValue) {
  return {
    email: siteConfig.demo?.email ?? 'admin@admin.com',
    password: siteConfig.demo?.password ?? 'admin',
  };
}

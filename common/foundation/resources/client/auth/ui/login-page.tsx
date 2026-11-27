import {LoginPayload} from '@common/auth/auth-queries';
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
import {EyeIcon, EyeOffIcon} from 'lucide-react';
import {ReactNode, useContext, useState} from 'react';
import {useForm} from 'react-hook-form';
import {Link, useLocation, useSearchParams} from 'react-router';
import {
  SiteConfigContext,
  SiteConfigContextValue,
} from '../../core/settings/site-config-context';
import {StaticPageTitle} from '../../seo/static-page-title';
import {useLogin} from '../requests/use-login';
import {AuthLayoutV2} from './auth-layout/auth-layout-v2';
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
  const {trans} = useTrans();
  const [showPassword, setShowPassword] = useState(false);

  const isWorkspaceLogin = pathname.includes('workspace');
  const searchParamsEmail = searchParams.get('email') || undefined;

  const {branding, registration, site} = useSettings();
  const registrationEnabled = !registration?.disable;
  const siteConfig = useContext(SiteConfigContext);

  const demoDefaults =
    site.demo && !searchParamsEmail ? getDemoFormDefaults(siteConfig) : {};
  const form = useForm<LoginPayload>({
    defaultValues: {remember: true, email: searchParamsEmail, ...demoDefaults},
  });
  const login = useLogin(form);

  const workspaceHeading = (
    <Trans
      values={{siteName: branding?.site_name}}
      message="To join your team on :siteName, login to your account"
    />
  );

  const signupPrompt = registrationEnabled ? (
    <p className="text-sm text-muted-foreground">
      <Trans
        message="Don't have an account? <a>Sign up</a>"
        values={{
          a: parts => (
            <Link
              className="font-medium text-primary hover:underline"
              to="/register"
            >
              {parts}
            </Link>
          ),
        }}
      />
    </p>
  ) : null;

  return (
    <AuthLayoutV2>
      <StaticPageTitle>
        <Trans message="Login" />
      </StaticPageTitle>

      {children}

      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {isWorkspaceLogin ? (
            workspaceHeading
          ) : (
            <Trans message="Login to your account" />
          )}
        </h1>
        {signupPrompt}
      </div>

      <div className="flex flex-col gap-5">
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
          <Field.Group className="gap-4">
            <HookForm.Field
              name="email"
              className="gap-1.5"
              invalid={!!form.formState.errors.email || undefined}
              disabled={!!searchParamsEmail}
            >
              <Field.Label htmlFor="login-email">
                <Trans message="Email Address" />
              </Field.Label>
              <Input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className="h-10"
                required
              />
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
              className="gap-1.5"
              invalid={!!form.formState.errors.password || undefined}
            >
              <Field.Label htmlFor="login-password">
                <Trans message="Password" />
              </Field.Label>
              <InputGroup className="h-10">
                <InputGroupInput
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
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

            <div className="flex flex-wrap items-center justify-between gap-2">
              <HookForm.Field name="remember">
                <Field.Root orientation="horizontal">
                  <Checkbox id="login-remember" />
                  <Field.Label
                    htmlFor="login-remember"
                    className="font-normal text-muted-foreground"
                  >
                    <Trans message="Remember me" />
                  </Field.Label>
                </Field.Root>
              </HookForm.Field>
              <Link
                className="inline-flex min-h-6 items-center text-sm font-medium text-primary hover:underline"
                to="/forgot-password"
              >
                <Trans message="Forgot password?" />
              </Link>
            </div>

            <Button
              className="w-full"
              size="lg"
              type="submit"
              variant="default"
              color="primary"
              disabled={login.isPending}
            >
              {login.isPending && <Spinner data-icon="inline-start" />}
              <Trans message="Login" />
            </Button>
          </Field.Group>
        </HookForm.Root>
        <SocialAuthSection dividerMessage={<Trans message="or" />} />
      </div>

      {bottomMessages && (
        <div className="text-sm text-muted-foreground">{bottomMessages}</div>
      )}
    </AuthLayoutV2>
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

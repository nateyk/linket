import {connectSocialWithPasswordOptions} from '@common/auth/auth-queries';
import {
  SocialService,
  useSocialLogin,
} from '@common/auth/requests/use-social-login';
import {useAllSocialLoginsDisabled} from '@common/auth/ui/use-all-social-logins-disabled';
import {useAuth} from '@common/auth/use-auth';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {SiEnvato, SiFacebook, SiX} from '@icons-pack/react-simple-icons';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {useMutation} from '@tanstack/react-query';
import {setBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {Trans} from '@ui/i18n/trans';
import {GoogleIcon} from '@ui/icons/social/google';
import {useSettings} from '@ui/settings/use-settings';
import clsx from 'clsx';
import {Fragment, ReactElement, ReactNode} from 'react';
import {useForm} from 'react-hook-form';

const googleLabel = <Trans message="Continue with google" />;
const facebookLabel = <Trans message="Continue with facebook" />;
const twitterLabel = <Trans message="Continue with twitter" />;
const envatoLabel = <Trans message="Continue with envato" />;

interface SocialAuthSectionProps {
  dividerMessage: ReactNode;
  isUsingInvite?: boolean;
}
export function SocialAuthSection({
  dividerMessage,
  isUsingInvite,
}: SocialAuthSectionProps) {
  const {social} = useSettings();
  const navigate = useNavigate();
  const {getRedirectUri} = useAuth();
  const {loginWithSocial, requestingPassword, setIsRequestingPassword} =
    useSocialLogin();

  if (useAllSocialLoginsDisabled({isUsingInvite})) {
    return null;
  }

  const handleSocialLogin = async (service: SocialService) => {
    const e = await loginWithSocial(service);
    if (e?.status === 'SUCCESS' || e?.status === 'ALREADY_LOGGED_IN') {
      navigate(getRedirectUri(), {replace: true});
    }
  };

  return (
    <Fragment>
      <div className="relative my-5 text-center before:absolute before:top-1/2 before:left-0 before:h-px before:w-full before:-translate-y-1/2 before:bg-border">
        <span className="relative z-10 bg-background px-2.5 text-sm text-muted-foreground dark:bg-card">
          {dividerMessage}
        </span>
      </div>
      <div
        className={clsx(
          'flex items-center justify-center',
          social?.compact_buttons ? 'gap-2' : 'flex-col gap-3.5',
        )}
      >
        {social?.google?.enable ? (
          <SocialLoginButton
            label={googleLabel}
            icon={<GoogleIcon viewBox="0 0 48 48" className="size-5" />}
            onClick={() => handleSocialLogin('google')}
          />
        ) : null}
        {social?.facebook?.enable ? (
          <SocialLoginButton
            label={facebookLabel}
            icon={<SiFacebook className="size-5 text-facebook" />}
            onClick={() => handleSocialLogin('facebook')}
          />
        ) : null}
        {social?.twitter?.enable ? (
          <SocialLoginButton
            label={twitterLabel}
            icon={<SiX className="size-5 text-twitter" />}
            onClick={() => handleSocialLogin('twitter')}
          />
        ) : null}
        {social?.envato?.enable && !isUsingInvite ? (
          <SocialLoginButton
            label={envatoLabel}
            icon={<SiEnvato className="size-5 text-envato" />}
            onClick={() => handleSocialLogin('envato')}
          />
        ) : null}
      </div>
      <Dialog.Root
        open={requestingPassword}
        onOpenChange={setIsRequestingPassword}
      >
        <Dialog.Portal>
          <Dialog.Backdrop />
          <RequestPasswordDialogContent
            onClose={() => setIsRequestingPassword(false)}
          />
        </Dialog.Portal>
      </Dialog.Root>
    </Fragment>
  );
}

function RequestPasswordDialogContent({onClose}: {onClose: () => void}) {
  const navigate = useNavigate();
  const {getRedirectUri} = useAuth();
  const form = useForm<{password: string}>();
  const connect = useMutation(connectSocialWithPasswordOptions());

  const handleConnect = (payload: {password: string}) => {
    connect.mutate(payload, {
      onSuccess: response => {
        setBootstrapData(response.bootstrapData);
        navigate(getRedirectUri(), {replace: true});
        onClose();
      },
      onError: r => onFormQueryError(r, form),
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={handleConnect}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Password required" />
          </Dialog.Title>
          <Dialog.Description>
            <Trans message="An account with this email address already exists. If you want to connect the two accounts, enter existing account password." />
          </Dialog.Description>
        </Dialog.Header>
        <Dialog.Body>
          <HookForm.Field name="password">
            <Field.Label>
              <Trans message="Password" />
            </Field.Label>
            <Input type="password" autoFocus required />
            <Field.Error />
          </HookForm.Field>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button
            type="submit"
            variant="default"
            color="primary"
            disabled={connect.isPending}
          >
            <Trans message="Connect" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

interface SocialLoginButtonProps {
  onClick: () => void;
  label: ReactElement;
  icon: ReactElement;
}
function SocialLoginButton({onClick, label, icon}: SocialLoginButtonProps) {
  const settings = useSettings();

  if (settings.social?.compact_buttons) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger
          render={<Button variant="outline" size="icon-lg" onClick={onClick} />}
        >
          {icon}
        </Tooltip.Trigger>
        <Tooltip.Content>{label}</Tooltip.Content>
      </Tooltip.Root>
    );
  }

  return (
    <Button variant="outline" onClick={onClick} className="w-full">
      {icon}
      <span className="min-w-40 text-start">{label}</span>
    </Button>
  );
}

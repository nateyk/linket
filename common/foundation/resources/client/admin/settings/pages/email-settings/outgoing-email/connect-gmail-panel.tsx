import {AdminSettings} from '@common/admin/settings/admin-settings';
import {useSocialLogin} from '@common/auth/requests/use-social-login';
import {SiGmail, SiGmailHex} from '@icons-pack/react-simple-icons';
import {Button} from '@shadcn/button/button';
import {toast} from '@shadcn/toast/toast';
import {Trans} from '@ui/i18n/trans';
import {useFormContext} from 'react-hook-form';

export function ConnectGmailPanel() {
  const {watch, setValue} = useFormContext<AdminSettings>();
  const {connectSocial} = useSocialLogin();
  const connectedEmail = watch('server.connectedGmailAccount');

  const handleGmailConnect = async () => {
    const e = await connectSocial('settings/mail/gmail/connect');
    if (e?.status === 'SUCCESS') {
      const email = (e.callbackData as any).profile.email;
      setValue('server.connectedGmailAccount', email);
      toast.success(
        <Trans message="Connected gmail account: :email" values={{email}} />,
      );
    }
  };

  const connectButton = (
    <Button
      variant="outline"
      color="primary"
      onClick={() => handleGmailConnect()}
    >
      <SiGmail color={SiGmailHex} />
      <Trans message="Connect gmail account" />
    </Button>
  );

  const reconnectPanel = (
    <div className="flex items-center gap-3.5 rounded-button border bg-secondary px-3.5 py-1.5 text-sm">
      <SiGmail color={SiGmailHex} />
      {connectedEmail}
      <Button
        variant="ghost"
        color="primary"
        className="ml-auto"
        onClick={() => handleGmailConnect()}
      >
        <Trans message="Reconnect" />
      </Button>
    </div>
  );

  return (
    <div>
      <div className="mb-1.5 text-sm font-medium">
        <Trans message="Gmail account" />
      </div>
      {connectedEmail ? reconnectPanel : connectButton}
    </div>
  );
}

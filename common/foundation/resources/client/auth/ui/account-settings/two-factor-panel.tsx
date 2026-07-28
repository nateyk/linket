import {User} from '@app/gen/schemas/user';
import {AccountSettingsPanel} from '@common/auth/ui/account-settings/account-settings-panel';
import {AccountSettingsId} from '@common/auth/ui/account-settings/account-settings-sidenav';
import {TwoFactorStepper} from '@common/auth/ui/account-settings/two-factor/stepper/two-factor-auth-stepper';
import {Trans} from '@ui/i18n/trans';

export function TwoFactorPanel({user}: {user: User}) {
  return (
    <AccountSettingsPanel
      id={AccountSettingsId.TwoFactor}
      title={<Trans message="Two factor authentication" />}
    >
      <div className="max-w-145">
        <TwoFactorStepper user={user} />
      </div>
    </AccountSettingsPanel>
  );
}

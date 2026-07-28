import {DemoLoginPanel} from '@app/auth/demo-login-panel';
import {RegisterPage as CommonRegisterPage} from '@common/auth/ui/register-page';
import {useSettings} from '@ui/settings/use-settings';

export function Component() {
  const {site} = useSettings();
  return (
    <CommonRegisterPage>
      {site?.demo ? <DemoLoginPanel /> : null}
    </CommonRegisterPage>
  );
}

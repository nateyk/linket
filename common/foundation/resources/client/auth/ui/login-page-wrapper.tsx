import {GuestRoute} from '@common/auth/guards/guest-route';
import {TwoFactorChallengePage} from '@common/auth/ui/account-settings/two-factor/two-factor-challenge-page';
import {LoginPage} from '@common/auth/ui/login-page';
import {ReactNode, useState} from 'react';

interface Props {
  bottomMessages?: ReactNode;
}
export function LoginPageWrapper({bottomMessages}: Props) {
  const [isTwoFactor, setIsTwoFactor] = useState(false);

  const component = isTwoFactor ? (
    <TwoFactorChallengePage />
  ) : (
    <LoginPage
      onTwoFactorChallenge={() => setIsTwoFactor(true)}
      bottomMessages={bottomMessages}
    />
  );

  return <GuestRoute>{component}</GuestRoute>;
}

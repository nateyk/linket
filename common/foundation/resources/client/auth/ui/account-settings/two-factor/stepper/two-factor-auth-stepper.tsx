import {User} from '@app/gen/schemas/user';
import {TwoFactorConfirmationStep} from '@common/auth/ui/account-settings/two-factor/stepper/two-factor-confirmation-step';
import {TwoFactorDisabledStep} from '@common/auth/ui/account-settings/two-factor/stepper/two-factor-disabled-step';
import {TwoFactorEnabledStep} from '@common/auth/ui/account-settings/two-factor/stepper/two-factor-enabled-step';
import {useState} from 'react';

enum Status {
  Disabled,
  WaitingForConfirmation,
  Enabled,
}

export function TwoFactorStepper({user}: {user: User}) {
  const [status, setStatus] = useState<Status>(getStatus(user));
  switch (status) {
    case Status.Disabled:
      return (
        <TwoFactorDisabledStep
          onEnabled={() => setStatus(Status.WaitingForConfirmation)}
        />
      );
    case Status.WaitingForConfirmation:
      return (
        <TwoFactorConfirmationStep
          onCancel={() => {
            setStatus(Status.Disabled);
          }}
          onConfirmed={() => {
            setStatus(Status.Enabled);
          }}
        />
      );
    case Status.Enabled:
      return (
        <TwoFactorEnabledStep
          user={user}
          onDisabled={() => setStatus(Status.Disabled)}
        />
      );
  }
}

function getStatus(user: User): Status {
  if (user.two_factor_confirmed_at) {
    return Status.Enabled;
  } else if (user.two_factor_recovery_codes) {
    return Status.WaitingForConfirmation;
  }
  return Status.Disabled;
}

import {User} from '@app/gen/schemas/user';
import {Alert} from '@shadcn/alert/alert';
import {Trans} from '@ui/i18n/trans';
import {useOutletContext} from 'react-router';

export function ActiveTrialBanner({className}: {className?: string}) {
  const data = useOutletContext<User>();
  if (!data.subscription?.trial_ends_at) {
    return null;
  }

  const daysLeft = Math.ceil(
    (new Date(data.subscription.trial_ends_at).getTime() -
      new Date().getTime()) /
      (1000 * 60 * 60 * 24),
  );
  if (daysLeft <= 0) {
    return null;
  }

  return (
    <Alert.Root className={className} variant="positive" fillStyle="subtleFill">
      <Alert.Description>
        <Trans
          message="You have <b>:daysLeft days left</b> in your free trial."
          values={{daysLeft, b: chunks => <b>{chunks}</b>}}
        />
      </Alert.Description>
    </Alert.Root>
  );
}

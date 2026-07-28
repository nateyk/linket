import {useAuth} from '@common/auth/use-auth';
import {LinkButton} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {ComponentProps} from 'react';

export function UpgradeButton(
  props: Partial<ComponentProps<typeof LinkButton>>,
) {
  const {isSubscribed} = useAuth();
  return (
    <LinkButton
      to={isSubscribed ? '/account-settings/billing/change-plan' : '/pricing'}
      variant="outline"
      color="primary"
      {...props}
    >
      <Trans message="Upgrade" />
    </LinkButton>
  );
}

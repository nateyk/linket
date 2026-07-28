import {useBillingPageRouteConfig} from '@common/billing/billing-page/billing-page-breadcrumb';
import {LinkButton} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {StripeElementsForm} from '../../checkout/stripe/stripe-elements-form';
import {billingRouteNames} from '../billing-route-names';

export function Component() {
  const {base_url} = useSettings();
  const {routes} = useBillingPageRouteConfig();
  const previousUrl = routes[billingRouteNames.billing];

  return (
    <StripeElementsForm
      confirmType="confirmSetup"
      createType="setupIntent"
      submitLabel={<Trans message="Change" />}
      returnUrl={`${base_url}${routes[billingRouteNames.changePaymentMethodDone]}`}
      cancelButton={
        <LinkButton
          variant="outline"
          className="flex-1"
          size="lg"
          to={previousUrl}
          type="button"
        >
          <Trans message="Go back" />
        </LinkButton>
      }
    />
  );
}

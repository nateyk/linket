import {User} from '@app/gen/schemas/user';
import {useBillingPageRouteConfig} from '@common/billing/billing-page/billing-page-breadcrumb';
import {billingRouteNames} from '@common/billing/billing-page/billing-route-names';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {EditIcon} from 'lucide-react';
import {Link, useOutletContext} from 'react-router';
import {BillingPlanPanel} from '../billing-plan-panel';
import paypalSvg from './paypal.svg';

export function PaymentMethodPanel() {
  const data = useOutletContext<User>();

  const isPaypal = data.subscription?.gateway_name === 'paypal';
  const PaymentMethod = isPaypal ? PaypalPaymentMethod : CardPaymentMethod;

  return (
    <BillingPlanPanel title={<Trans message="Payment method" />}>
      {data.subscription ? (
        <PaymentMethod
          methodClassName="whitespace-nowrap text-base max-w-116 flex items-center gap-2.5"
          linkClassName="flex items-center gap-1.5 text-muted-foreground mt-4.5 block hover:underline"
        />
      ) : (
        <div className="text-muted-foreground italic">
          <Trans message="No payment method set" />
        </div>
      )}
    </BillingPlanPanel>
  );
}

interface PaymentMethodProps {
  methodClassName: string;
  linkClassName: string;
}
function CardPaymentMethod({
  methodClassName,
  linkClassName,
}: PaymentMethodProps) {
  const {routes} = useBillingPageRouteConfig();
  const data = useOutletContext<User>();
  return (
    <>
      <div className={methodClassName}>
        <span className="capitalize">{data.card_brand}</span> ••••
        {data.card_last_four}
        {data.card_expires && (
          <div className="ml-auto">
            <Trans message="Expires :date" values={{date: data.card_expires}} />
          </div>
        )}
      </div>
      <Link
        className={linkClassName}
        to={routes[billingRouteNames.changePaymentMethod]}
      >
        <EditIcon className="size-5" />
        <Trans message="Change payment method" />
      </Link>
    </>
  );
}

function PaypalPaymentMethod({
  methodClassName,
  linkClassName,
}: PaymentMethodProps) {
  const data = useOutletContext<User>();
  const settings = useSettings();
  const isSandbox = settings.billing?.paypal_test_mode;
  const baseUrl = isSandbox
    ? 'https://www.sandbox.paypal.com'
    : 'https://www.paypal.com';
  return (
    <>
      <div className={methodClassName}>
        <img src={paypalSvg} alt="Paypal" />
      </div>
      <a
        className={linkClassName}
        href={`${baseUrl}/myaccount/autopay/connect/${data.subscription!.gateway_id}/funding`}
        target="_blank"
        rel="noreferrer"
      >
        <EditIcon className="size-5" />
        <Trans message="Change payment method" />
      </a>
    </>
  );
}

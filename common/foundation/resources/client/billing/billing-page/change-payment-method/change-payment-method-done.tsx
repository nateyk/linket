import {changeDefaultstripePaymentMethod} from '@app/gen/stripe';
import {useBillingPageRouteConfig} from '@common/billing/billing-page/billing-page-breadcrumb';
import {queryClient} from '@common/http/query-client';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {loadStripe, SetupIntent} from '@stripe/stripe-js';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {useEffect, useRef, useState} from 'react';
import {useSearchParams} from 'react-router';
import {
  BillingRedirectMessage,
  BillingRedirectMessageConfig,
} from '../../billing-redirect-message';
import {billingRouteNames} from '../billing-route-names';

export function Component() {
  const {billing} = useSettings();
  const navigate = useNavigate();
  const {routes} = useBillingPageRouteConfig();
  const previousUrl = routes[billingRouteNames.billing];

  const [params] = useSearchParams();
  const clientSecret = params.get('setup_intent_client_secret');

  const [messageConfig, setMessageConfig] =
    useState<BillingRedirectMessageConfig>();

  const stripeInitiated = useRef(false);

  useEffect(() => {
    if (
      stripeInitiated.current ||
      !clientSecret ||
      !billing?.stripe_public_key
    ) {
      return;
    }

    loadStripe(billing?.stripe_public_key).then(stripe => {
      if (!stripe) {
        setMessageConfig(getRedirectMessageConfig(previousUrl));
        return;
      }
      stripe.retrieveSetupIntent(clientSecret).then(({setupIntent}) => {
        if (setupIntent?.status === 'succeeded') {
          changeDefaultstripePaymentMethod({
            payment_method_id: setupIntent.payment_method as string,
          }).then(() => {
            Promise.allSettled([
              queryClient.invalidateQueries({
                queryKey: ['users'],
              }),
            ]);
          });
        }
        setMessageConfig(
          getRedirectMessageConfig(previousUrl, setupIntent?.status),
        );
      });
    });
    stripeInitiated.current = true;
  }, [billing?.stripe_public_key, clientSecret, previousUrl]);

  if (!clientSecret) {
    navigate(previousUrl);
    return null;
  }

  return <BillingRedirectMessage config={messageConfig} />;
}

function getRedirectMessageConfig(
  previousUrl: string,
  status?: SetupIntent.Status,
): BillingRedirectMessageConfig {
  switch (status) {
    case 'succeeded':
      return {
        link: previousUrl,
        buttonLabel: <Trans message="Go back" />,
        message: <Trans message="Payment method changed successfully!" />,
        status: 'success',
      };
    case 'processing':
      return {
        link: previousUrl,
        buttonLabel: <Trans message="Go back" />,
        message: (
          <Trans message="Your request is processing. We'll update you when your payment method is confirmed." />
        ),
        status: 'success',
      };
    case 'requires_payment_method':
      return {
        link: previousUrl,
        buttonLabel: <Trans message="Go back" />,
        message: (
          <Trans message="Payment method confirmation failed. Please try another payment method." />
        ),
        status: 'error',
      };
    default:
      return {
        link: previousUrl,
        buttonLabel: <Trans message="Go back" />,
        message: <Trans message="Something went wrong" />,
        status: 'error',
      };
  }
}

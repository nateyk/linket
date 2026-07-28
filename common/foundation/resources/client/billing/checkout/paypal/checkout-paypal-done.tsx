import {storePaypalSubscriptionDetailsLocally} from '@app/gen/paypal';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Trans} from '@ui/i18n/trans';
import {useEffect, useRef, useState} from 'react';
import {useSearchParams} from 'react-router';
import {
  BillingRedirectMessage,
  BillingRedirectMessageConfig,
} from '../../billing-redirect-message';
import {CheckoutLayout} from '../checkout-layout';
import {CheckoutProductSummary} from '../checkout-product-summary';

export function Component() {
  const {productId, priceId} = useRequiredParams(['productId', 'priceId']);
  const [params] = useSearchParams();
  const alreadyStoredLocally = useRef(false);

  const [messageConfig, setMessageConfig] =
    useState<BillingRedirectMessageConfig>();

  useEffect(() => {
    const subscriptionId = params.get('subscriptionId');
    const status = params.get('status');

    if (alreadyStoredLocally.current) {
      return;
    }

    if (subscriptionId && status === 'success') {
      storePaypalSubscriptionDetailsLocally({
        paypal_subscription_id: subscriptionId,
      }).then(() => {
        setMessageConfig(
          getRedirectMessageConfig('success', productId, priceId),
        );
        window.location.href = '/billing';
      });
    } else {
      setMessageConfig(getRedirectMessageConfig(status, productId, priceId));
    }
    alreadyStoredLocally.current = true;
  }, [priceId, productId, params]);

  return (
    <CheckoutLayout>
      <BillingRedirectMessage config={messageConfig} />
      <CheckoutProductSummary showBillingLine={false} />
    </CheckoutLayout>
  );
}

function getRedirectMessageConfig(
  status?: 'success' | 'error' | string | null,
  productId?: string,
  priceId?: string,
): BillingRedirectMessageConfig {
  switch (status) {
    case 'success':
      return {
        message: <Trans message="Subscription successful!" />,
        status: 'success',
        buttonLabel: <Trans message="Return to site" />,
        link: '/billing',
      };
    default:
      return {
        message: <Trans message="Something went wrong. Please try again." />,
        status: 'error',
        buttonLabel: <Trans message="Go back" />,
        link: errorLink(productId, priceId),
      };
  }
}

function errorLink(productId?: string, priceId?: string): string {
  return productId && priceId ? `/checkout/${productId}/${priceId}` : '/';
}

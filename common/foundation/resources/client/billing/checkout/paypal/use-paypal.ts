import {listProductsOptions} from '@common/admin/subscriptions/products-queries';
import {loadScript} from '@paypal/paypal-js';
import {useSuspenseQuery} from '@tanstack/react-query';
import {useSettings} from '@ui/settings/use-settings';
import {useEffect, useRef, useState} from 'react';

interface UsePaypalProps {
  productId?: string;
  priceId?: string;
}
export function usePaypal({productId, priceId}: UsePaypalProps) {
  const productsQuery = useSuspenseQuery(listProductsOptions());
  const products = productsQuery.data?.data;
  const paypalLoadStarted = useRef<boolean>(false);
  const paypalButtonsRendered = useRef<boolean>(false);
  const [paypalIsLoaded, setPaypalIsLoaded] = useState(false);
  const paypalElementRef = useRef<HTMLDivElement>(null);
  const {base_url, billing} = useSettings();

  const stripeEnabled = billing?.stripe?.enable;
  const paypalEnabled = billing?.paypal?.enable;
  const public_key = billing?.paypal?.public_key;

  useEffect(() => {
    if (!paypalEnabled || !public_key || paypalLoadStarted.current) return;
    loadScript({
      clientId: public_key,
      intent: 'subscription',
      vault: true,
      disableFunding: stripeEnabled ? 'card' : undefined,
    }).then(() => {
      setPaypalIsLoaded(true);
    });
    paypalLoadStarted.current = true;
  }, [public_key, paypalEnabled, stripeEnabled]);

  useEffect(() => {
    if (
      !paypalIsLoaded ||
      !window.paypal?.Buttons ||
      !paypalElementRef.current ||
      !products.length ||
      !productId ||
      !priceId ||
      paypalButtonsRendered.current
    )
      return;

    const product = products.find(p => `${p.id}` === productId);
    const price = product?.prices?.find(p => `${p.id}` === priceId);

    if (!price?.paypal_id) {
      return;
    }

    window.paypal
      .Buttons({
        style: {
          label: 'pay',
        },
        createSubscription: (data, actions) => {
          return actions.subscription.create({
            application_context: {
              shipping_preference: 'NO_SHIPPING',
              return_url: `${base_url}/checkout/${productId}/${priceId}/paypal/done?subscriptionId=${data.subscriptionID}&status=success`,
              cancel_url: `${base_url}/checkout/${productId}/${priceId}/paypal/done?status=error`,
            },
            plan_id: price.paypal_id!,
          });
        },
        onApprove: (data, actions) => {
          actions.redirect(
            `${base_url}/checkout/${productId}/${priceId}/paypal/done?subscriptionId=${data.subscriptionID}&status=success`,
          );
          return Promise.resolve();
        },
        onError: e => {
          location.href = `${base_url}/checkout/${productId}/${priceId}/paypal/done?status=error`;
        },
      })
      .render(paypalElementRef.current)
      .then(() => {
        paypalButtonsRendered.current = true;
      });
  }, [productId, priceId, paypalIsLoaded, base_url, products]);

  return {
    paypalElementRef,
    stripeIsEnabled: public_key != null && paypalEnabled,
  };
}

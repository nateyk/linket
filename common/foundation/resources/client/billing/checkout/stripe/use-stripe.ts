import {CreatePartialStripeSubscription200} from '@app/gen/schemas/create-partial-stripe-subscription200';
import {CreateStripeSetupIntent200} from '@app/gen/schemas/create-stripe-setup-intent200';
import {
  createPartialStripeSubscription,
  createStripeSetupIntent,
} from '@app/gen/stripe';
import {useAuth} from '@common/auth/use-auth';
import {loadStripe, Stripe, StripeElements} from '@stripe/stripe-js';
import {useSelectedLocale} from '@ui/i18n/selected-locale';
import {useSettings} from '@ui/settings/use-settings';
import {useIsDarkMode} from '@ui/themes/use-is-dark-mode';
import {useEffect, useRef, useState} from 'react';

interface UseStripeProps {
  type: 'createSetupIntent' | 'createSubscription';
  productId?: string | number;
  priceId?: string | number;
}
export function useStripe({type, productId, priceId}: UseStripeProps) {
  const {user} = useAuth();
  const isDarkMode = useIsDarkMode();
  const isInitiatedRef = useRef<boolean>(false);
  const paymentElementRef = useRef<HTMLDivElement>(null);
  const {localeCode} = useSelectedLocale();
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [subscriptionId, setSubscriptionId] = useState<string | null>(null);
  const {
    branding: {site_name},
    billing,
  } = useSettings();

  useEffect(() => {
    if (
      !billing?.stripe?.enable ||
      !billing?.stripe_public_key ||
      isInitiatedRef.current
    )
      return;

    Promise.all([
      // load stripe js library
      loadStripe(billing.stripe_public_key, {
        //apiVersion: '2022-08-01',
        locale: localeCode as any,
      }),
      // create partial subscription for clientSecret
      type === 'createSetupIntent'
        ? createStripeSetupIntent()
        : createPartialStripeSubscription({
            product_id: Number(productId),
            price_id: priceId ? Number(priceId) : undefined,
          }),
    ]).then(([stripe, _backendResult]) => {
      const backendResult = _backendResult as
        | CreatePartialStripeSubscription200
        | CreateStripeSetupIntent200;

      if (stripe && paymentElementRef.current) {
        const elements = stripe.elements({
          clientSecret: backendResult.clientSecret,
          appearance: {
            theme: isDarkMode ? 'night' : 'stripe',
          },
        });

        // Create and mount the Payment Element
        const paymentElement = elements.create('payment', {
          business: {name: site_name},
          terms: {card: 'never'},
          fields: {
            billingDetails: {
              address: 'auto',
            },
          },
          defaultValues: {
            billingDetails: {
              email: user?.email,
            },
          },
        });
        paymentElement.mount(paymentElementRef.current);

        setStripe(stripe);
        setElements(elements);
        setSubscriptionId(
          'subscriptionId' in backendResult
            ? backendResult.subscriptionId
            : null,
        );
      }
    });

    isInitiatedRef.current = true;
  }, [
    productId,
    priceId,
    billing?.stripe_public_key,
    billing?.stripe?.enable,
    isDarkMode,
    localeCode,
    site_name,
    type,
    user?.email,
  ]);

  return {
    stripe,
    elements,
    paymentElementRef,
    stripeIsEnabled:
      billing?.stripe_public_key != null && billing?.stripe?.enable,
    subscriptionId,
  };
}

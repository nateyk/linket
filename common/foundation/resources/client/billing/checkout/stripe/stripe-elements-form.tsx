import {useStripe} from '@common/billing/checkout/stripe/use-stripe';
import {Button} from '@shadcn/button/button';
import {Spinner} from '@shadcn/spinner/spinner';
import {cn} from '@ui/utils/cn';
import {ReactNode, SubmitEventHandler, useState} from 'react';

interface StripeElementsFormProps {
  productId?: string | number;
  priceId?: string | number;
  confirmType: 'confirmSetup' | 'confirmPayment';
  createType: 'subscription' | 'setupIntent';
  submitLabel: ReactNode;
  cancelButton?: ReactNode;
  returnUrl: string;
}
export function StripeElementsForm({
  productId,
  priceId,
  confirmType,
  createType,
  submitLabel,
  cancelButton,
  returnUrl: userReturnUrl,
}: StripeElementsFormProps) {
  const {stripe, elements, paymentElementRef, stripeIsEnabled, subscriptionId} =
    useStripe({
      type:
        createType === 'setupIntent'
          ? 'createSetupIntent'
          : 'createSubscription',
      productId,
      priceId,
    });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // disable upgrade button if stripe is enabled, but not loaded yet
  const stripeIsReady: boolean =
    !stripeIsEnabled || (elements != null && stripe != null);

  const handleSubmit: SubmitEventHandler<HTMLFormElement> = async e => {
    e.preventDefault();

    // stripe has not loaded yet
    if (!stripe || !elements) return;

    setIsSubmitting(true);

    let returnUrl = userReturnUrl;

    if (subscriptionId) {
      const url = new URL(userReturnUrl);
      url.searchParams.set('subscriptionId', subscriptionId);
      returnUrl = url.href;
    }

    try {
      const result = await stripe[confirmType]({
        elements,
        confirmParams: {
          return_url: returnUrl,
        },
      });

      // don't show validation error as it will be shown already by stripe payment element
      if (result.error?.type !== 'validation_error' && result.error?.message) {
        setErrorMessage(result.error.message);
      }
    } catch {
      //
    }

    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div
        ref={paymentElementRef}
        className={cn('min-h-20', !stripeIsEnabled && 'hidden')}
      >
        {stripeIsEnabled && (
          <div className="flex min-h-20 max-w-118 items-center justify-center">
            <Spinner className="size-6" />
          </div>
        )}
      </div>
      {errorMessage && !isSubmitting && (
        <div className="mt-5 text-destructive">{errorMessage}</div>
      )}
      <div className="mt-10 flex max-w-118 items-center gap-2">
        {cancelButton}
        <Button
          variant="default"
          color="primary"
          size="lg"
          className="flex-1"
          type="submit"
          disabled={isSubmitting || !stripeIsReady}
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

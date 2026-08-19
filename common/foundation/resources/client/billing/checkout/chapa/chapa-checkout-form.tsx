import {Button} from '@shadcn/button/button';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {LandmarkIcon} from 'lucide-react';
import {useState} from 'react';

export function ChapaCheckoutForm({
  productId,
  priceId,
}: {
  productId: string;
  priceId: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(false);

  const startCheckout = async () => {
    setSubmitting(true);
    setError(false);
    try {
      const response = await fetch('/api/v1/billing/chapa/checkout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {'Content-Type': 'application/json', Accept: 'application/json'},
        body: JSON.stringify({product_id: Number(productId), price_id: Number(priceId)}),
      });
      const data = await response.json().catch(() => undefined);
      if (!response.ok || typeof data?.checkout_url !== 'string') throw new Error();
      window.location.assign(data.checkout_url);
    } catch {
      setError(true);
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button className="w-full" size="lg" disabled={submitting} onClick={() => void startCheckout()}>
        {submitting ? <Spinner /> : <LandmarkIcon />}
        <Trans message={submitting ? 'Opening Chapa...' : 'Continue to Chapa'} />
      </Button>
      {error && (
        <p className="text-sm text-danger">
          <Trans message="We could not start Chapa checkout. Please verify that this plan has an ETB price and try again." />
        </p>
      )}
    </div>
  );
}

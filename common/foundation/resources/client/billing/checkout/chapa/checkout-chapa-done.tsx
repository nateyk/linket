import {Button} from '@shadcn/button/button';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {CheckCircle2Icon, RefreshCwIcon} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {useNavigate, useSearchParams} from 'react-router';
import {CheckoutLayout} from '../checkout-layout';

export function Component() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'paid' | 'error'>('pending');
  const txRef = params.get('tx_ref');

  const refresh = useCallback(async () => {
    if (!txRef) return setStatus('error');
    try {
      const response = await fetch(`/api/v1/billing/chapa/transactions/${encodeURIComponent(txRef)}`, {
        credentials: 'same-origin',
        headers: {Accept: 'application/json'},
      });
      const data = await response.json();
      setStatus(data?.status === 'paid' ? 'paid' : 'pending');
    } catch {
      setStatus('error');
    }
  }, [txRef]);

  useEffect(() => {
    void refresh();
    if (status === 'paid') return;
    const timer = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(timer);
  }, [refresh, status]);

  return (
    <CheckoutLayout>
      <div className="mx-auto max-w-md space-y-5 py-12 text-center">
        {status === 'paid' ? <CheckCircle2Icon className="mx-auto size-10 text-positive" /> : <Spinner className="mx-auto size-10 text-primary" />}
        <div>
          <h1 className="text-2xl font-semibold">
            <Trans message={status === 'paid' ? 'Subscription active' : 'Finalizing your payment'} />
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            <Trans message={status === 'paid' ? 'Your Chapa payment was confirmed.' : 'We are securely verifying your Chapa payment. This can take a moment.'} />
          </p>
        </div>
        {status === 'paid' ? (
          <Button onClick={() => navigate('/billing')}><Trans message="View billing" /></Button>
        ) : (
          <Button variant="outline" onClick={() => void refresh()}>
            <RefreshCwIcon />
            <Trans message="Refresh status" />
          </Button>
        )}
      </div>
    </CheckoutLayout>
  );
}

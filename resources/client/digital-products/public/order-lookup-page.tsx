import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Input} from '@shadcn/forms/input/input';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {
  ArrowLeftIcon,
  DownloadIcon,
  FileDownIcon,
  MailIcon,
  PackageOpenIcon,
  SearchIcon,
} from 'lucide-react';
import {useCallback, useState} from 'react';

type OrderDownload = {
  name: string;
  url: string;
  remaining_downloads: number | null;
  expires_at: string | null;
};

type OrderLookupOrder = {
  id: string;
  product_title: string | null;
  currency: string;
  gross_amount_cents: number;
  paid_at: string | null;
  receipt_sent_at: string | null;
  downloads: OrderDownload[];
};

type OrderLookupResponse = {
  orders: OrderLookupOrder[];
};

export function Component() {
  return <OrderLookupPage />;
}

export function OrderLookupPage() {
  const [email, setEmail] = useState('');
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderLookupOrder[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async () => {
    if (!email || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    if (!reference.trim()) {
      setError('Enter your order or payment reference.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setOrders(null);

    try {
      const response = await fetch('/api/v1/public/order-lookup', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
        body: JSON.stringify({
          email: email.trim(),
          reference: reference.trim(),
        }),
      });

      const payload = await response.json().catch(() => undefined);

      if (!response.ok) {
        throw new Error(payload?.message ?? 'Unable to look up orders.');
      }

      const data: OrderLookupResponse = payload.data ?? payload;
      if (!data.orders?.length) {
        setOrders(null);
        setError('No paid orders found for that email and order reference.');
      } else {
        setOrders(data.orders);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to look up orders.');
    } finally {
      setSubmitting(false);
    }
  }, [email, reference]);

  const resendReceipt = useCallback(
    async (orderId: string) => {
      setResending(orderId);

      try {
        const response = await fetch('/api/v1/public/order-lookup/resend-receipt', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
          body: JSON.stringify({email: email.trim(), order_id: orderId}),
        });

        if (!response.ok) {
          throw new Error('Unable to resend receipt.');
        }
      } catch {
        // silently fail, user can try again
      } finally {
        setResending(null);
      }
    },
    [email],
  );

  const reset = () => {
    setOrders(null);
    setError(null);
    setEmail('');
    setReference('');
  };

  return (
    <div className="relative isolate min-h-screen overflow-hidden px-4 py-10 sm:px-6">
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-muted/30 to-background" />

      <main className="relative mx-auto flex w-full max-w-2xl flex-col gap-6">
        <BackButton onClick={orders ? reset : undefined} />

        {!orders && !error && (
          <>
            <Card.Root className="gap-0 overflow-hidden bg-card text-card-foreground shadow-xl ring-1 ring-foreground/10">
              <Card.Header>
                <Card.Title className="flex items-center gap-2">
                  <PackageOpenIcon className="size-5 text-primary" />
                  <Trans message="Find your purchase" />
                </Card.Title>
                <Card.Description>
                  <Trans message="Enter the email and order reference from your receipt to view protected download links." />
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="order-lookup-email"
                      className="block text-sm font-medium text-foreground"
                    >
                      <Trans message="Email address" />
                    </label>
                  <Input
                    id="order-lookup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={submitting}
                    bindToHookForm={false}
                  />
                  </div>
                  <div>
                    <label
                      htmlFor="order-lookup-reference"
                      className="block text-sm font-medium text-foreground"
                    >
                      <Trans message="Order reference" />
                    </label>
                    <Input
                      id="order-lookup-reference"
                      type="text"
                      autoComplete="off"
                      placeholder="Order ID or Chapa reference"
                      value={reference}
                      onChange={e => setReference(e.target.value)}
                      disabled={submitting}
                      bindToHookForm={false}
                    />
                  </div>
                  {error && (
                    <Alert variant="destructive" fillStyle="subtleFill">
                      <MailIcon />
                      <Alert.Title>
                        <Trans message="Lookup failed" />
                      </Alert.Title>
                      <Alert.Description>{error}</Alert.Description>
                    </Alert>
                  )}
                  <Button
                    className="w-full"
                    size="lg"
                    disabled={submitting}
                    onClick={() => void lookup()}
                  >
                    {submitting ? <Spinner /> : <SearchIcon />}
                    {submitting ? (
                      <Trans message="Searching..." />
                    ) : (
                      <Trans message="Find my orders" />
                    )}
                  </Button>
                </div>
              </Card.Content>
            </Card.Root>

            <p className="text-center text-sm text-muted-foreground">
              <Trans message="You'll receive an email with download links after purchase. Check your spam folder if you don't see it." />
            </p>
          </>
        )}

        {orders && orders.length > 0 && (
          <OrderResults orders={orders} onResendReceipt={orderId => void resendReceipt(orderId)} resending={resending} />
        )}

        {error && !orders && (
          <Alert variant="warning" fillStyle="subtleFill">
            <MailIcon />
            <Alert.Title>
              <Trans message="No orders found" />
            </Alert.Title>
            <Alert.Description>
              <p className="mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={reset}>
                <Trans message="Try a different email" />
              </Button>
            </Alert.Description>
          </Alert>
        )}
      </main>
    </div>
  );
}

function BackButton({onClick}: {onClick?: () => void}) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.assign('/');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex h-9 w-fit items-center gap-2 rounded-button bg-background/90 px-3 text-sm font-medium text-foreground shadow-xs backdrop-blur-sm transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      <ArrowLeftIcon className="size-4" />
      <Trans message="Back" />
    </button>
  );
}

function OrderResults({
  orders,
  onResendReceipt,
  resending,
}: {
  orders: OrderLookupOrder[];
  onResendReceipt: (orderId: string) => void;
  resending: string | null;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        <Trans message="Your paid orders" />
      </h1>

      {orders.map(order => (
        <Card.Root
          key={order.id}
          className="gap-0 overflow-hidden bg-card text-card-foreground shadow-sm ring-1 ring-foreground/10"
        >
          <Card.Header>
            <Card.Title className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <PackageOpenIcon className="size-4 text-primary" />
                {order.product_title ?? <Trans message="Digital product" />}
              </span>
              <span className="text-lg font-medium">
                {formatPrice(order.gross_amount_cents, order.currency)}
              </span>
            </Card.Title>
            <Card.Description>
              {order.paid_at && (
                <span>
                  <Trans
                    message="Purchased on :date"
                    values={{date: formatDate(order.paid_at)}}
                  />
                </span>
              )}
            </Card.Description>
          </Card.Header>

          <Card.Content>
            {order.downloads.length > 0 ? (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground">
                  <Trans message="Your downloads" />
                </h3>
                <div className="divide-y rounded-card border">
                  {order.downloads.map(download => (
                    <div
                      key={download.url}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <FileDownIcon className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {download.name}
                      </span>
                      {typeof download.remaining_downloads === 'number' && (
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                          <Trans
                            message=":count left"
                            values={{count: download.remaining_downloads}}
                          />
                        </span>
                      )}
                      <Button
                        size="sm"
                        render={<a href={download.url} download />}
                      >
                        <DownloadIcon />
                        <Trans message="Download" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <Alert variant="warning" fillStyle="subtleFill">
                <FileDownIcon />
                <Alert.Title>
                  <Trans message="Downloads unavailable" />
                </Alert.Title>
                <Alert.Description>
                  <Trans message="Your download links have expired or been used up. Contact the creator for assistance." />
                </Alert.Description>
              </Alert>
            )}

            <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3 text-sm">
              <span className="text-muted-foreground">
                {order.receipt_sent_at ? (
                  <Trans
                    message="Receipt sent :date"
                    values={{date: formatDate(order.receipt_sent_at)}}
                  />
                ) : (
                  <Trans message="Receipt not yet sent" />
                )}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={resending === order.id}
                onClick={() => onResendReceipt(order.id)}
              >
                {resending === order.id ? <Spinner /> : <MailIcon />}
                <Trans message="Resend receipt" />
              </Button>
            </div>
          </Card.Content>
        </Card.Root>
      ))}
    </div>
  );
}

function formatPrice(priceCents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(priceCents / 100);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

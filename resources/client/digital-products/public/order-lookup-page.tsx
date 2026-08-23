import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Input} from '@shadcn/forms/input/input';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {formatMoney as formatPrice} from '@ui/i18n/format-money';
import {message} from '@ui/i18n/message';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {toast} from '@ui/toast/toast';
import {
  ArrowLeftIcon,
  DownloadIcon,
  FileDownIcon,
  MailCheckIcon,
  MailIcon,
  PackageOpenIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import {ReactNode, useCallback, useEffect, useState} from 'react';
import {Link, useLocation} from 'react-router';

type OrderDownload = {
  id: number;
  name: string | null;
  remaining_downloads: number;
  expires_at: string | null;
  available: boolean;
};

type Order = {
  id: string;
  product_title: string | null;
  currency: string;
  gross_amount_cents: number;
  paid_at: string | null;
  receipt_sent_at: string | null;
  downloads: OrderDownload[];
};

export function Component() {
  const location = useLocation();

  return location.pathname.endsWith('/orders') ? <PurchaseOrders /> : <RecoveryRequest />;
}

function RecoveryRequest() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const expired = new URLSearchParams(useLocation().search).has('expired');

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      await fetch('/api/v1/public/order-lookup/request', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
        body: JSON.stringify({email: email.trim()}),
      });
      setSent(true);
    } catch {
      setError('We could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return <PublicShell>
    <Card.Root className="gap-0 overflow-hidden shadow-sm ring-1 ring-foreground/10">
      <Card.Header className="space-y-2">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"><PackageOpenIcon className="size-5" /></div>
        <Card.Title><Trans message="Find my purchase" /></Card.Title>
        <Card.Description><Trans message="Enter the email used at checkout. If we find paid purchases, we’ll send a secure sign-in link." /></Card.Description>
      </Card.Header>
      <Card.Content className="space-y-4">
        {expired && <Alert variant="warning" fillStyle="subtleFill"><ShieldCheckIcon /><Alert.Title><Trans message="That recovery link has expired" /></Alert.Title><Alert.Description><Trans message="Request a new secure link to continue." /></Alert.Description></Alert>}
        {sent ? <Alert fillStyle="subtleFill"><MailCheckIcon /><Alert.Title><Trans message="Check your inbox" /></Alert.Title><Alert.Description><Trans message="If paid purchases match that email address, you’ll receive a secure recovery link shortly." /></Alert.Description></Alert> : <>
          <div className="space-y-2"><label htmlFor="purchase-recovery-email" className="text-sm font-medium"><Trans message="Email address" /></label><Input id="purchase-recovery-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} disabled={submitting} bindToHookForm={false} /></div>
          {error && <Alert variant="destructive" fillStyle="subtleFill"><MailIcon /><Alert.Title><Trans message="Unable to continue" /></Alert.Title><Alert.Description>{error}</Alert.Description></Alert>}
          <Button className="w-full" size="lg" disabled={submitting} onClick={() => void submit()}>{submitting ? <Spinner /> : <MailIcon />}<Trans message="Email me a secure link" /></Button>
        </>}
      </Card.Content>
    </Card.Root>
    <p className="text-center text-sm text-muted-foreground"><Trans message="For your privacy, we never show purchase details until you open the secure link sent to your email." /></p>
  </PublicShell>;
}

function PurchaseOrders() {
  const [orders, setOrders] = useState<Order[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/public/order-lookup/orders', {credentials: 'same-origin', headers: {Accept: 'application/json'}});
      const payload = await response.json().catch(() => undefined);
      if (!response.ok) throw new Error(payload?.message || 'Your recovery session has expired.');
      setOrders(payload?.orders ?? payload?.data?.orders ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your recovery session has expired.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const withCsrf = async (): Promise<Record<string, string>> => {
    await fetch('/sanctum/csrf-cookie', {credentials: 'same-origin'});
    const token = document.cookie.split('; ').find(value => value.startsWith('XSRF-TOKEN='))?.split('=')[1];
    const headers: Record<string, string> = {Accept: 'application/json'};
    if (token) headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
    return headers;
  };

  const download = async (order: Order, entitlement: OrderDownload) => {
    setBusy(`download-${entitlement.id}`);
    try {
      const response = await fetch(`/api/v1/public/order-lookup/orders/${order.id}/downloads/${entitlement.id}`, {method: 'POST', credentials: 'same-origin', headers: await withCsrf()});
      const payload = await response.json().catch(() => undefined);
      if (!response.ok || !payload?.url) throw new Error(payload?.message || 'This protected download is no longer available.');
      window.location.assign(payload.url);
    } catch (reason) {
      toast.danger(reason instanceof Error ? reason.message : 'Unable to prepare your download.');
    } finally {
      setBusy(undefined);
    }
  };

  const resend = async (order: Order) => {
    setBusy(`receipt-${order.id}`);
    try {
      const response = await fetch(`/api/v1/public/order-lookup/orders/${order.id}/resend-receipt`, {method: 'POST', credentials: 'same-origin', headers: await withCsrf()});
      const payload = await response.json().catch(() => undefined);
      if (!response.ok) throw new Error(payload?.message || 'Unable to resend the receipt.');
      toast(message('Your receipt is being sent.'));
      void load();
    } catch (reason) {
      toast.danger(reason instanceof Error ? reason.message : 'Unable to resend the receipt.');
    } finally {
      setBusy(undefined);
    }
  };

  return <PublicShell>
    <div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight"><Trans message="Your purchases" /></h1><p className="mt-1 text-sm text-muted-foreground"><Trans message="Your private purchase recovery session is active for 30 minutes." /></p></div><Button variant="outline" size="sm" render={<Link to="/find-my-purchase" />}><ArrowLeftIcon /><Trans message="Done" /></Button></div>
    {loading ? <div className="flex min-h-40 items-center justify-center"><Spinner /></div> : error ? <Alert variant="warning" fillStyle="subtleFill"><ShieldCheckIcon /><Alert.Title><Trans message="Session unavailable" /></Alert.Title><Alert.Description><p>{error}</p><Button className="mt-3" size="sm" variant="outline" render={<Link to="/find-my-purchase" />}><Trans message="Request a new link" /></Button></Alert.Description></Alert> : orders?.length ? <div className="space-y-4">{orders.map(order => <OrderCard key={order.id} order={order} busy={busy} onDownload={download} onResend={resend} />)}</div> : <Alert fillStyle="subtleFill"><PackageOpenIcon /><Alert.Title><Trans message="No paid purchases found" /></Alert.Title><Alert.Description><Trans message="This secure link does not have any paid Digital Product purchases to show." /></Alert.Description></Alert>}
  </PublicShell>;
}

function OrderCard({order, busy, onDownload, onResend}: {order: Order; busy?: string; onDownload: (order: Order, download: OrderDownload) => Promise<void>; onResend: (order: Order) => Promise<void>}) {
  const downloads = order.downloads.filter(download => download.available);
  return <Card.Root className="gap-0 overflow-hidden shadow-sm ring-1 ring-foreground/10"><Card.Header><Card.Title className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2"><PackageOpenIcon className="size-4 text-primary" />{order.product_title ?? <Trans message="Digital product" />}</span><span className="text-base">{formatPrice(order.gross_amount_cents, order.currency)}</span></Card.Title><Card.Description>{order.paid_at ? <Trans message="Purchased on :date" values={{date: <FormattedDate date={order.paid_at} />}} /> : <Trans message="Paid purchase" />}</Card.Description></Card.Header><Card.Content className="space-y-4">{downloads.length ? <div className="divide-y rounded-card border">{downloads.map(download => <div key={download.id} className="flex items-center gap-3 px-3 py-3"><FileDownIcon className="size-4 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{download.name ?? <Trans message="Download file" />}</span><span className="hidden text-xs text-muted-foreground sm:inline"><Trans message=":count left" values={{count: download.remaining_downloads}} /></span><Button size="sm" disabled={busy === `download-${download.id}`} onClick={() => void onDownload(order, download)}>{busy === `download-${download.id}` ? <Spinner /> : <DownloadIcon />}<Trans message="Download" /></Button></div>)}</div> : <Alert variant="warning" fillStyle="subtleFill"><FileDownIcon /><Alert.Title><Trans message="Downloads unavailable" /></Alert.Title><Alert.Description><Trans message="Your protected download links have expired, were refunded, or have reached their download limit." /></Alert.Description></Alert>}<div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"><span className="text-xs text-muted-foreground">{order.receipt_sent_at ? <Trans message="Receipt sent :date" values={{date: <FormattedDate date={order.receipt_sent_at} />}} /> : <Trans message="Receipt available" />}</span><Button variant="outline" size="sm" disabled={busy === `receipt-${order.id}`} onClick={() => void onResend(order)}>{busy === `receipt-${order.id}` ? <Spinner /> : <MailIcon />}<Trans message="Resend receipt" /></Button></div></Card.Content></Card.Root>;
}

function PublicShell({children}: {children: ReactNode}) {
  return <div className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6"><main className="mx-auto flex w-full max-w-2xl flex-col gap-6">{children}</main></div>;
}


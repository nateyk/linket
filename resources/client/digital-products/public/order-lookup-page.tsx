import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Textarea} from '@shadcn/forms/textarea/textarea';
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
  GraduationCapIcon,
  MailCheckIcon,
  MailIcon,
  PackageOpenIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
} from 'lucide-react';
import {auth} from '@common/auth/use-auth';
import {ReactNode, useCallback, useEffect, useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router';

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
  review: {stars: number | null; title: string | null; review: string | null} | null;
  downloads: OrderDownload[];
};

export function Component() {
  const location = useLocation();
  const isAuth = auth.isLoggedIn;
  if (location.pathname.endsWith('/purchases')) return <PurchaseOrders />;
  if (isAuth) return <AuthenticatedMyOrder />;
  return <RecoveryRequest />;
}

function AuthenticatedMyOrder() {
  const [courses, setCourses] = useState<{course_id: number; title: string; cover?: {url: string} | null; total_lessons: number; percent: number}[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/v1/my-courses', {credentials: 'same-origin', headers: {Accept: 'application/json'}});
        if (res.ok) {
          const payload = await res.json();
          setCourses(payload.data ?? []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  return (
    <PublicShell>
      <PromotionBanner />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight"><Trans message="My orders & courses" /></h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <Trans message="Your purchases and enrolled courses in one place." />
          </p>
        </div>
        <Button variant="outline" size="sm" render={<Link to="/dashboard/my-courses" />}><GraduationCapIcon /><Trans message="Go to learning" /></Button>
      </div>
      {loading ? (
        <div className="flex min-h-40 items-center justify-center"><Spinner /></div>
      ) : courses.length ? (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold"><Trans message="My courses" /></h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {courses.map(c => (
              <Card.Root key={c.course_id} className="gap-0 overflow-hidden py-0">
                <div className="aspect-video bg-muted">
                  {c.cover?.url ? <img src={c.cover.url} alt={c.title} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center text-muted-foreground"><GraduationCapIcon className="size-8" /></div>}
                </div>
                <Card.Content className="p-3">
                  <p className="text-sm font-medium">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.percent}% • {c.total_lessons} lessons</p>
                  <Button size="sm" className="mt-2 w-full" render={<Link to={`/dashboard/learn/${c.course_id}`}/>}><Trans message="Continue" /></Button>
                </Card.Content>
              </Card.Root>
            ))}
          </div>
        </div>
      ) : (
        <Alert fillStyle="subtleFill"><GraduationCapIcon /><Alert.Title><Trans message="No courses yet" /></Alert.Title><Alert.Description><Trans message="Courses you purchase will appear here. Explore promoted courses below." /></Alert.Description></Alert>
      )}
      <Card.Root className="gap-0 overflow-hidden">
        <Card.Header><Card.Title><Trans message="Need your downloads?" /></Card.Title><Card.Description><Trans message="Verify your purchase email to unlock protected downloads when you bought as guest." /></Card.Description></Card.Header>
        <Card.Content className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" render={<Link to="/my-order/purchases" />}><MailIcon /><Trans message="Go to purchases" /></Button>
          <Button variant="outline" render={<Link to="/dashboard/my-courses" />}><GraduationCapIcon /><Trans message="My courses" /></Button>
        </Card.Content>
      </Card.Root>
    </PublicShell>
  );
}

function PromotionBanner() {
  return (
    <Card.Root className="overflow-hidden border-primary/20 bg-primary/5 py-0">
      <Card.Content className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><SparklesIcon className="size-5" /></span>
          <div>
            <p className="text-sm font-semibold"><Trans message="Level up with featured courses" /></p>
            <p className="text-xs text-muted-foreground"><Trans message="New creator courses are live on Linket — keep learning and unlock your next certificate." /></p>
          </div>
        </div>
        <Button size="sm" variant="outline" render={<Link to="/dashboard/my-courses" />}><GraduationCapIcon /><Trans message="Explore courses" /></Button>
      </Card.Content>
    </Card.Root>
  );
}

function RecoveryRequest() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string>();
  const requestCode = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch('/api/v1/public/my-order/request-code', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
        body: JSON.stringify({email: email.trim()}),
      });
      if (!response.ok) throw new Error();
      setSent(true);
    } catch {
      setError('We could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      const response = await fetch('/api/v1/public/my-order/verify-code', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {Accept: 'application/json', 'Content-Type': 'application/json'},
        body: JSON.stringify({email: email.trim(), code}),
      });
      const payload = await response.json().catch(() => undefined);
      if (!response.ok) throw new Error(payload?.message || 'That sign-in code is invalid or has expired.');
      navigate('/my-order/purchases');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not verify your code.');
    } finally {
      setSubmitting(false);
    }
  };

  return <PublicShell>
    <Card.Root className="gap-0 overflow-hidden shadow-sm ring-1 ring-foreground/10">
      <Card.Header className="space-y-2">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"><PackageOpenIcon className="size-5" /></div>
        <Card.Title><Trans message="Your purchases" /></Card.Title>
        <Card.Description><Trans message="Enter the email used at checkout to receive a 6-digit sign-in code." /></Card.Description>
      </Card.Header>
      <Card.Content className="space-y-4">
        {sent ? <>
          <Alert fillStyle="subtleFill"><MailCheckIcon /><Alert.Title><Trans message="Check your inbox" /></Alert.Title><Alert.Description><Trans message="Enter the 6-digit code we sent if paid purchases match this email address." /></Alert.Description></Alert>
          <div className="flex flex-col gap-2"><label htmlFor="purchase-code" className="text-sm font-medium"><Trans message="Sign-in code" /></label><Input id="purchase-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} disabled={submitting} bindToHookForm={false} className="text-center font-mono text-xl tracking-[0.45em]" /></div>
          <Button className="w-full" size="lg" disabled={submitting} onClick={() => void verifyCode()}>{submitting ? <Spinner /> : <ShieldCheckIcon />}<Trans message="Verify code" /></Button>
          <Button className="w-full" variant="outline" disabled={submitting} onClick={() => void requestCode()}><Trans message="Resend code" /></Button>
        </> : <>
          <div className="space-y-2"><label htmlFor="purchase-recovery-email" className="text-sm font-medium"><Trans message="Email address" /></label><Input id="purchase-recovery-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} disabled={submitting} bindToHookForm={false} /></div>
          {error && <Alert variant="destructive" fillStyle="subtleFill"><MailIcon /><Alert.Title><Trans message="Unable to continue" /></Alert.Title><Alert.Description>{error}</Alert.Description></Alert>}
          <Button className="w-full" size="lg" disabled={submitting} onClick={() => void requestCode()}>{submitting ? <Spinner /> : <MailIcon />}<Trans message="Email me a sign-in code" /></Button>
        </>}
      </Card.Content>
    </Card.Root>
    <p className="text-center text-sm text-muted-foreground"><Trans message="For your privacy, we show purchase details only after you verify your email code." /></p>
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
      const response = await fetch('/api/v1/public/my-order/purchases', {credentials: 'same-origin', headers: {Accept: 'application/json'}});
      const payload = await response.json().catch(() => undefined);
      if (!response.ok) throw new Error(payload?.message || 'Your portal session has expired.');
      setOrders(payload?.orders ?? payload?.data?.orders ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Your portal session has expired.');
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
      const response = await fetch(`/api/v1/public/my-order/purchases/${order.id}/downloads/${entitlement.id}`, {method: 'POST', credentials: 'same-origin', headers: await withCsrf()});
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
      const response = await fetch(`/api/v1/public/my-order/purchases/${order.id}/resend-receipt`, {method: 'POST', credentials: 'same-origin', headers: await withCsrf()});
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
    <div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight"><Trans message="Your purchases" /></h1><p className="mt-1 text-sm text-muted-foreground"><Trans message="Your private portal session is active for 30 days." /></p></div><Button variant="outline" size="sm" render={<Link to="/my-order" />}><ArrowLeftIcon /><Trans message="Done" /></Button></div>
    {loading ? <div className="flex min-h-40 items-center justify-center"><Spinner /></div> : error ? <Alert variant="warning" fillStyle="subtleFill"><ShieldCheckIcon /><Alert.Title><Trans message="Session unavailable" /></Alert.Title><Alert.Description><p>{error}</p><Button className="mt-3" size="sm" variant="outline" render={<Link to="/my-order" />}><Trans message="Request a new code" /></Button></Alert.Description></Alert> : orders?.length ? <div className="space-y-4">{orders.map(order => <ReviewableOrderCard key={order.id} order={order} busy={busy} onDownload={download} onResend={resend} onSaved={load} />)}</div> : <Alert fillStyle="subtleFill"><PackageOpenIcon /><Alert.Title><Trans message="No paid purchases found" /></Alert.Title><Alert.Description><Trans message="This verified email does not have any paid digital product purchases to show." /></Alert.Description></Alert>}
  </PublicShell>;
}

function ReviewableOrderCard({onSaved, ...props}: Parameters<typeof OrderCard>[0] & {onSaved: () => Promise<void>}) {
  const [open, setOpen] = useState(false);

  return <>
    <OrderCard {...props} />
    <div className="-mt-2 flex justify-end"><Button variant="outline" size="sm" onClick={() => setOpen(true)}><StarIcon />{props.order.review ? <Trans message="Edit review" /> : <Trans message="Write a review" />}</Button></div>
    {open && <PortalReviewDialog order={props.order} onClose={() => setOpen(false)} onSaved={onSaved} />}
  </>;
}

function PortalReviewDialog({order, onClose, onSaved}: {order: Order; onClose: () => void; onSaved: () => Promise<void>}) {
  const [stars, setStars] = useState(order.review?.stars ?? 0);
  const [title, setTitle] = useState(order.review?.title ?? '');
  const [review, setReview] = useState(order.review?.review ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>();

  const submit = async () => {
    if (!stars) {
      setError('Choose a star rating to continue.');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      await fetch('/sanctum/csrf-cookie', {credentials: 'same-origin'});
      const token = document.cookie.split('; ').find(value => value.startsWith('XSRF-TOKEN='))?.split('=')[1];
      const response = await fetch(`/api/v1/public/my-order/purchases/${order.id}/review`, {
        method: 'POST', credentials: 'same-origin', headers: {Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? {'X-XSRF-TOKEN': decodeURIComponent(token)} : {})},
        body: JSON.stringify({stars, title: title.trim() || undefined, review: review.trim() || undefined}),
      });
      const payload = await response.json().catch(() => undefined);
      if (!response.ok) throw new Error(payload?.message || 'We could not save your review.');
      await onSaved();
      onClose();
      toast(message('Your review has been saved.'));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not save your review.');
    } finally {
      setSubmitting(false);
    }
  };

  return <Dialog.Root open onOpenChange={isOpen => !isOpen && !submitting && onClose()}><Dialog.Portal><Dialog.Backdrop /><Dialog.Content className="sm:max-w-md"><Dialog.Header><Dialog.Title><StarIcon className="text-amber-500" />{order.review ? <Trans message="Edit your review" /> : <Trans message="Write a review" />}</Dialog.Title></Dialog.Header><Dialog.Body><div className="space-y-4"><div className="flex gap-1" aria-label="Star rating">{[1, 2, 3, 4, 5].map(value => <Button key={value} type="button" size="icon" variant="ghost" className="size-9" onClick={() => setStars(value)} aria-label={`${value} stars`}><StarIcon className={value <= stars ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'} /></Button>)}</div><Field.Root><Field.Label><Trans message="Headline (optional)" /></Field.Label><Input value={title} onChange={event => setTitle(event.target.value)} bindToHookForm={false} maxLength={120} /></Field.Root><Field.Root><Field.Label><Trans message="Review (optional)" /></Field.Label><Textarea rows={4} value={review} onChange={event => setReview(event.target.value)} bindToHookForm={false} maxLength={5000} /></Field.Root>{error && <Alert variant="destructive" fillStyle="subtleFill"><Alert.Description>{error}</Alert.Description></Alert>}</div></Dialog.Body><Dialog.Footer><Button variant="outline" disabled={submitting} onClick={onClose}><Trans message="Cancel" /></Button><Button disabled={submitting} onClick={() => void submit()}>{submitting && <Spinner />}<Trans message="Save review" /></Button></Dialog.Footer></Dialog.Content></Dialog.Portal></Dialog.Root>;
}

function OrderCard({order, busy, onDownload, onResend}: {order: Order; busy?: string; onDownload: (order: Order, download: OrderDownload) => Promise<void>; onResend: (order: Order) => Promise<void>}) {
  const downloads = order.downloads.filter(download => download.available);
  return <Card.Root className="gap-0 overflow-hidden shadow-sm ring-1 ring-foreground/10"><Card.Header><Card.Title className="flex flex-wrap items-center justify-between gap-2"><span className="flex items-center gap-2"><PackageOpenIcon className="size-4 text-primary" />{order.product_title ?? <Trans message="Digital product" />}</span><span className="text-base">{formatPrice(order.gross_amount_cents, order.currency)}</span></Card.Title><Card.Description>{order.paid_at ? <Trans message="Purchased on :date" values={{date: <FormattedDate date={order.paid_at} />}} /> : <Trans message="Paid purchase" />}</Card.Description></Card.Header><Card.Content className="space-y-4">{downloads.length ? <div className="divide-y rounded-card border">{downloads.map(download => <div key={download.id} className="flex items-center gap-3 px-3 py-3"><FileDownIcon className="size-4 shrink-0 text-muted-foreground" /><span className="min-w-0 flex-1 truncate text-sm font-medium">{download.name ?? <Trans message="Download file" />}</span><span className="hidden text-xs text-muted-foreground sm:inline"><Trans message=":count left" values={{count: download.remaining_downloads}} /></span><Button size="sm" disabled={busy === `download-${download.id}`} onClick={() => void onDownload(order, download)}>{busy === `download-${download.id}` ? <Spinner /> : <DownloadIcon />}<Trans message="Download" /></Button></div>)}</div> : <Alert variant="warning" fillStyle="subtleFill"><FileDownIcon /><Alert.Title><Trans message="Downloads unavailable" /></Alert.Title><Alert.Description><Trans message="Your protected download links have expired, were refunded, or have reached their download limit." /></Alert.Description></Alert>}<div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3"><span className="text-xs text-muted-foreground">{order.receipt_sent_at ? <Trans message="Receipt sent :date" values={{date: <FormattedDate date={order.receipt_sent_at} />}} /> : <Trans message="Receipt available" />}</span><Button variant="outline" size="sm" disabled={busy === `receipt-${order.id}`} onClick={() => void onResend(order)}>{busy === `receipt-${order.id}` ? <Spinner /> : <MailIcon />}<Trans message="Resend receipt" /></Button></div></Card.Content></Card.Root>;
}

function PublicShell({children}: {children: ReactNode}) {
  return <div className="min-h-screen bg-muted/30 px-4 py-10 sm:px-6"><main className="mx-auto flex w-full max-w-2xl flex-col gap-6">{children}</main></div>;
}

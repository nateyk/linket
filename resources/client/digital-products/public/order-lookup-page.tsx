import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {
  RadioGroup,
  RadioGroupItem,
} from '@shadcn/forms/radio-group/radio-group';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {formatMoney as formatPrice} from '@ui/i18n/format-money';
import {message} from '@ui/i18n/message';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {toast} from '@ui/toast/toast';
import {
  DownloadIcon,
  FileDownIcon,
  GraduationCapIcon,
  MailCheckIcon,
  MailIcon,
  PackageOpenIcon,
  PlayIcon,
  ShieldCheckIcon,
  StarIcon,
} from 'lucide-react';
import {auth} from '@common/auth/use-auth';
import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {Link, useLocation, useNavigate} from 'react-router';
import {AuthLayoutV2} from '@common/auth/ui/auth-layout/auth-layout-v2';
import {
  DEMO_DOWNLOAD_ORDERS,
  DEMO_PORTAL_COURSES,
} from './my-portal-demo-data';
import {
  continueCourses,
  filterCourses,
  PortalContinueStrip,
  PortalCourseFilters,
  PortalCourseGrid,
  type CourseFilter,
  type PortalCourse,
} from './my-portal-library-ui';
import {MyPortalShell} from './my-portal-shell';
import {
  PortalAccountLayout,
  type PortalNavSection,
} from './my-portal-sidebar';

const PORTAL_EMAIL_KEY = 'my-portal-email';

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
  product_cover?: string | null;
  product_type?: string | null;
  course_id?: number | null;
  currency: string;
  gross_amount_cents: number;
  paid_at: string | null;
  receipt_sent_at: string | null;
  review: {
    stars: number | null;
    title: string | null;
    review: string | null;
  } | null;
  downloads: OrderDownload[];
  is_demo?: boolean;
};

type EnrolledCourse = PortalCourse;

export function Component() {
  const location = useLocation();
  const isAuth = auth.isLoggedIn;
  const forceRecovery =
    (location.state as {forceRecovery?: boolean} | null)?.forceRecovery === true;

  if (isAuth && !forceRecovery) {
    return <MyPortalLibrary mode="auth" />;
  }
  if (
    !forceRecovery &&
    (location.pathname.endsWith('/purchases') ||
      location.pathname === '/my-portal' ||
      location.pathname === '/my-portal/')
  ) {
    return <MyPortalLibrary mode="guest" />;
  }
  return <RecoveryRequest />;
}

function MyPortalLibrary({mode}: {mode: 'auth' | 'guest'}) {
  const [filter, setFilter] = useState<CourseFilter>('all');
  const [activeSection, setActiveSection] =
    useState<PortalNavSection>('courses');
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseFailed, setCourseFailed] = useState(false);
  const [purchasesError, setPurchasesError] = useState<string>();
  const [busy, setBusy] = useState<string>();
  const portalEmail = (() => {
    try {
      return sessionStorage.getItem(PORTAL_EMAIL_KEY) ?? undefined;
    } catch {
      return undefined;
    }
  })();
  const enrolledCourseIds = useMemo(
    () => new Set(courses.map(course => course.course_id)),
    [courses],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setCourseFailed(false);
    setPurchasesError(undefined);
    try {
      if (mode === 'guest') {
        const response = await apiClient.get('/api/v1/public/my-portal/library');
        const payload = response.data;
        setCourses(payload?.courses ?? payload?.data?.courses ?? []);
        setOrders(payload?.orders ?? payload?.data?.orders ?? []);
      } else {
        const [coursesResult, purchasesResult] = await Promise.allSettled([
          apiClient.get('/api/v1/my-courses'),
          apiClient.get('/api/v1/public/my-portal/library'),
        ]);
        if (coursesResult.status === 'fulfilled') {
          setCourses(coursesResult.value.data.data ?? []);
        } else {
          setCourseFailed(true);
        }
        if (purchasesResult.status === 'fulfilled') {
          const payload = purchasesResult.value.data;
          setOrders(payload?.orders ?? payload?.data?.orders ?? []);
          const libraryCourses =
            payload?.courses ?? payload?.data?.courses ?? [];
          if (coursesResult.status !== 'fulfilled' && libraryCourses.length) {
            setCourses(libraryCourses);
            setCourseFailed(false);
          }
        } else {
          const apiMessage = getApiErrorMessage(purchasesResult.reason);
          setPurchasesError(
            apiMessage !== 'An error occurred.'
              ? apiMessage
              : 'Your portal session has expired.',
          );
        }
      }
    } catch (reason) {
      const apiMessage = getApiErrorMessage(reason);
      if (mode === 'guest') {
        setPurchasesError(
          apiMessage !== 'An error occurred.'
            ? apiMessage
            : 'Your portal session has expired.',
        );
      } else {
        setCourseFailed(true);
      }
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    void load();
  }, [load]);

  const withCsrf = async (): Promise<Record<string, string>> => {
    await fetch('/sanctum/csrf-cookie', {credentials: 'same-origin'});
    const token = document.cookie
      .split('; ')
      .find(value => value.startsWith('XSRF-TOKEN='))
      ?.split('=')[1];
    const headers: Record<string, string> = {Accept: 'application/json'};
    if (token) headers['X-XSRF-TOKEN'] = decodeURIComponent(token);
    return headers;
  };

  const download = async (order: Order, entitlement: OrderDownload) => {
    if (order.is_demo) {
      toast(message('Sample download — real files appear after purchase.'));
      return;
    }
    setBusy(`download-${entitlement.id}`);
    try {
      const headers = await withCsrf();
      const response = await apiClient.post(
        `/api/v1/public/my-portal/purchases/${order.id}/downloads/${entitlement.id}`,
        {},
        {headers},
      );
      const payload = response.data;
      if (!payload?.url)
        throw new Error(
          payload?.message || 'This protected download is no longer available.',
        );
      window.location.assign(payload.url);
    } catch (reason) {
      const apiMessage = getApiErrorMessage(reason);
      toast.danger(
        apiMessage !== 'An error occurred.'
          ? apiMessage
          : reason instanceof Error
            ? reason.message
            : 'Unable to prepare your download.',
      );
    } finally {
      setBusy(undefined);
    }
  };

  const resend = async (order: Order) => {
    if (order.is_demo) {
      toast(message('Sample receipt — real receipts appear after purchase.'));
      return;
    }
    setBusy(`receipt-${order.id}`);
    try {
      const headers = await withCsrf();
      const response = await apiClient.post(
        `/api/v1/public/my-portal/purchases/${order.id}/resend-receipt`,
        {},
        {headers},
      );
      const payload = response.data;
      if (!payload && response.status >= 400)
        throw new Error('Unable to resend the receipt.');
      toast(message('Your receipt is being sent.'));
      void load();
    } catch (reason) {
      const apiMessage = getApiErrorMessage(reason);
      toast.danger(
        apiMessage !== 'An error occurred.'
          ? apiMessage
          : reason instanceof Error
            ? reason.message
            : 'Unable to resend the receipt.',
      );
    } finally {
      setBusy(undefined);
    }
  };

  const realDownloadOrders = orders.filter(
    order => order.product_type !== 'course' && !order.course_id,
  );
  // Full empty library → sample layout; any real purchase replaces demos.
  const usingDemoLibrary =
    !loading &&
    !courses.length &&
    !realDownloadOrders.length &&
    !courseFailed &&
    !(purchasesError && mode === 'auth');
  const displayCourses = usingDemoLibrary ? DEMO_PORTAL_COURSES : courses;
  const filteredCourses = filterCourses(displayCourses, filter);
  const continueList = continueCourses(
    usingDemoLibrary ? [] : displayCourses,
  );
  const downloadOrders = usingDemoLibrary
    ? (DEMO_DOWNLOAD_ORDERS as Order[])
    : realDownloadOrders;
  const authQuery = portalEmail
    ? `?email=${encodeURIComponent(portalEmail)}`
    : '';

  return (
    <MyPortalShell wide>
      {loading ? (
        <div className="flex min-h-40 items-center justify-center">
          <Spinner />
        </div>
      ) : purchasesError && mode === 'guest' && !courses.length ? (
        <Alert variant="warning" fillStyle="subtleFill">
          <ShieldCheckIcon />
          <Alert.Title>
            <Trans message="Session unavailable" />
          </Alert.Title>
          <Alert.Description>
            <p>{purchasesError}</p>
            <Button
              className="mt-3"
              size="sm"
              variant="outline"
              render={<Link to="/my-portal" state={{forceRecovery: true}} />}
            >
              <Trans message="Request a new code" />
            </Button>
          </Alert.Description>
        </Alert>
      ) : (
        <PortalAccountLayout
          mode={mode}
          email={portalEmail || auth.user?.email || undefined}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        >
          <div className="space-y-6">
            {usingDemoLibrary && (
              <Alert fillStyle="subtleFill">
                <PackageOpenIcon />
                <Alert.Title>
                  <Trans message="Sample library layout" />
                </Alert.Title>
                <Alert.Description>
                  <Trans message="Showing demo courses and downloads so you can preview the portal. Your real purchases replace this automatically." />
                </Alert.Description>
              </Alert>
            )}

            <PortalContinueStrip courses={continueList} />

            <section
              id="portal-courses"
              className="space-y-4 scroll-mt-32"
            >
              <div className="space-y-4">
                <h1 className="mb-2 text-2xl font-medium">
                  <Trans message="My purchased courses" />
                </h1>
                <PortalCourseFilters value={filter} onChange={setFilter} />
              </div>
              {courseFailed && !courses.length ? (
                <Alert variant="warning" fillStyle="subtleFill">
                  <GraduationCapIcon />
                  <Alert.Title>
                    <Trans message="Courses unavailable" />
                  </Alert.Title>
                  <Alert.Description>
                    <Trans message="Unable to load your courses." />
                  </Alert.Description>
                </Alert>
              ) : filteredCourses.length ? (
                <PortalCourseGrid courses={filteredCourses} />
              ) : (
                <Alert fillStyle="subtleFill">
                  <GraduationCapIcon />
                  <Alert.Title>
                    <Trans message="No courses in this filter" />
                  </Alert.Title>
                  <Alert.Description>
                    <Trans message="Try another filter to see more of your courses." />
                  </Alert.Description>
                </Alert>
              )}
              {mode === 'guest' && courses.length ? (
                <p className="text-xs text-muted-foreground">
                  <Trans message="Optional: create an account with this email to keep progress on all devices." />{' '}
                  <Link className="underline" to={`/register${authQuery}`}>
                    <Trans message="Create account" />
                  </Link>
                </p>
              ) : null}
            </section>

            <section
              id="portal-downloads"
              className="flex flex-col gap-4 scroll-mt-32"
            >
              <h2 className="text-2xl font-medium">
                <Trans message="Downloads" />
              </h2>
              {purchasesError && mode === 'auth' ? (
                <Alert variant="warning" fillStyle="subtleFill">
                  <ShieldCheckIcon />
                  <Alert.Title>
                    <Trans message="Purchases locked" />
                  </Alert.Title>
                  <Alert.Description>
                    <p>
                      <Trans message="Verify the email you used at checkout to unlock downloads and receipts in this browser." />
                    </p>
                    <Button
                      className="mt-3"
                      size="sm"
                      variant="outline"
                      render={
                        <Link to="/my-portal" state={{forceRecovery: true}} />
                      }
                    >
                      <Trans message="Verify purchase email" />
                    </Button>
                  </Alert.Description>
                </Alert>
              ) : downloadOrders.length ? (
                <div className="flex flex-col gap-4">
                  {downloadOrders.map(order => (
                    <ReviewableOrderCard
                      key={order.id}
                      order={order}
                      busy={busy}
                      enrolledCourseIds={enrolledCourseIds}
                      onDownload={download}
                      onResend={resend}
                      onSaved={load}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  <Trans message="File downloads from your purchases will show up here." />
                </p>
              )}
            </section>
          </div>
        </PortalAccountLayout>
      )}
    </MyPortalShell>
  );
}

type RecoveryError = 'email' | 'code' | 'request' | 'expired' | {api: string};

function RecoveryRequest() {
  const navigate = useNavigate();
  const {trans} = useTrans();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<RecoveryError>();
  const requestCode = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('email');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      await apiClient.post('/api/v1/public/my-portal/request-code', {
        email: email.trim(),
      });
      setSent(true);
    } catch {
      setError('request');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async () => {
    if (!/^\d{6}$/.test(code)) {
      setError('code');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      await apiClient.post('/api/v1/public/my-portal/verify-code', {
        email: email.trim(),
        code,
      });
      try {
        sessionStorage.setItem(PORTAL_EMAIL_KEY, email.trim());
      } catch {
        // ignore storage failures
      }
      navigate('/my-portal');
    } catch (reason) {
      const apiMessage = getApiErrorMessage(reason);
      setError(
        apiMessage !== 'An error occurred.' ? {api: apiMessage} : 'expired',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayoutV2>
      <div className="flex flex-col gap-2 text-center">
        <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <PackageOpenIcon className="size-5" />
        </div>
        <h1 className="text-3xl font-medium">
          <Trans message="Your purchases" />
        </h1>
        <p className="text-sm text-muted-foreground">
          <Trans message="Enter the email used at checkout to receive a 6-digit sign-in code." />
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {sent ? (
          <>
            <Alert fillStyle="subtleFill">
              <MailCheckIcon />
              <Alert.Title>
                <Trans message="Check your inbox" />
              </Alert.Title>
              <Alert.Description>
                <Trans message="Enter the 6-digit code we sent if paid purchases match this email address." />
              </Alert.Description>
            </Alert>
            <Field.Root invalid={error === 'code' ? true : undefined}>
              <Field.Label>
                <Trans message="Sign-in code" />
              </Field.Label>
              <Input
                id="purchase-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={event => {
                  setCode(event.target.value.replace(/\D/g, ''));
                  if (error === 'code') setError(undefined);
                }}
                disabled={submitting}
                bindToHookForm={false}
                aria-invalid={error === 'code' ? true : undefined}
                className="text-center font-mono text-xl tracking-widest tabular-nums"
              />
              {error === 'code' && (
                <Field.Error>
                  <Trans message="Enter the 6-digit code from your email." />
                </Field.Error>
              )}
            </Field.Root>
            <RecoveryProblem error={error} />
            <Button
              className="w-full"
              size="lg"
              disabled={submitting}
              onClick={() => void verifyCode()}
            >
              {submitting ? <Spinner /> : <ShieldCheckIcon />}
              <Trans message="Verify code" />
            </Button>
            <Button
              className="w-full"
              variant="outline"
              disabled={submitting}
              onClick={() => void requestCode()}
            >
              <Trans message="Resend code" />
            </Button>
          </>
        ) : (
          <>
            <Field.Root invalid={error === 'email' ? true : undefined}>
              <Field.Label>
                <Trans message="Email address" />
              </Field.Label>
              <Input
                id="purchase-recovery-email"
                type="email"
                autoComplete="email"
                placeholder={trans({message: 'you@example.com'})}
                value={email}
                onChange={event => {
                  setEmail(event.target.value);
                  if (error === 'email') setError(undefined);
                }}
                disabled={submitting}
                bindToHookForm={false}
                aria-invalid={error === 'email' ? true : undefined}
              />
              {error === 'email' && (
                <Field.Error>
                  <Trans message="Enter a valid email address." />
                </Field.Error>
              )}
            </Field.Root>
            <RecoveryProblem error={error} />
            <Button
              className="w-full"
              size="lg"
              disabled={submitting}
              onClick={() => void requestCode()}
            >
              {submitting ? <Spinner /> : <MailIcon />}
              <Trans message="Email me a sign-in code" />
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Trans message="For your privacy, we show purchase details only after you verify your email code." />
            </p>
          </>
        )}
      </div>
    </AuthLayoutV2>
  );
}

function RecoveryProblem({error}: {error?: RecoveryError}) {
  if (!error || error === 'email' || error === 'code') return null;

  return (
    <Alert variant="destructive" fillStyle="subtleFill">
      <MailIcon />
      <Alert.Title>
        <Trans message="Unable to continue" />
      </Alert.Title>
      <Alert.Description>
        {error === 'request' && (
          <Trans message="We could not submit your request. Please try again." />
        )}
        {error === 'expired' && (
          <Trans message="That sign-in code is invalid or has expired." />
        )}
        {typeof error === 'object' ? error.api : null}
      </Alert.Description>
    </Alert>
  );
}


function ReviewableOrderCard({
  onSaved,
  enrolledCourseIds,
  ...props
}: Parameters<typeof OrderCard>[0] & {onSaved: () => Promise<void>}) {
  const [open, setOpen] = useState(false);
  const isDemo = !!props.order.is_demo;

  return (
    <>
      <OrderCard
        {...props}
        enrolledCourseIds={enrolledCourseIds}
        onReview={isDemo ? undefined : () => setOpen(true)}
      />
      {open && !isDemo && (
        <PortalReviewDialog
          order={props.order}
          onClose={() => setOpen(false)}
          onSaved={onSaved}
        />
      )}
    </>
  );
}

function PortalReviewDialog({
  order,
  onClose,
  onSaved,
}: {
  order: Order;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [stars, setStars] = useState(order.review?.stars ?? 0);
  const [title, setTitle] = useState(order.review?.title ?? '');
  const [review, setReview] = useState(order.review?.review ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<'stars' | 'save' | {api: string}>();
  const {trans} = useTrans();

  const submit = async () => {
    if (!stars) {
      setError('stars');
      return;
    }

    setSubmitting(true);
    setError(undefined);
    try {
      await fetch('/sanctum/csrf-cookie', {credentials: 'same-origin'});
      const token = document.cookie
        .split('; ')
        .find(value => value.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];
      await apiClient.post(
        `/api/v1/public/my-portal/purchases/${order.id}/review`,
        {
          stars,
          title: title.trim() || undefined,
          review: review.trim() || undefined,
        },
        {
          headers: {
            ...(token ? {'X-XSRF-TOKEN': decodeURIComponent(token)} : {}),
          },
        },
      );
      await onSaved();
      onClose();
      toast(message('Your review has been saved.'));
    } catch (reason) {
      const apiMessage = getApiErrorMessage(reason);
      setError(
        apiMessage !== 'An error occurred.' ? {api: apiMessage} : 'save',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog.Root
      open
      onOpenChange={isOpen => !isOpen && !submitting && onClose()}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="sm:max-w-md">
          <Dialog.Header>
            <Dialog.Title>
              <StarIcon className="text-warning" />
              {order.review ? (
                <Trans message="Edit your review" />
              ) : (
                <Trans message="Write a review" />
              )}
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <div className="flex flex-col gap-4">
              <RadioGroup
                orientation="horizontal"
                value={stars ? String(stars) : null}
                onValueChange={next => setStars(Number(next))}
                aria-label={trans({message: 'Star rating'})}
                aria-invalid={error === 'stars' ? true : undefined}
                disabled={submitting}
                className="w-auto gap-1"
              >
                {[1, 2, 3, 4, 5].map(value => (
                  <RadioGroupItem
                    key={value}
                    value={String(value)}
                    aria-label={trans({
                      message: '[one :value star|other :value stars]',
                      values: {value},
                    })}
                    className="size-9 rounded-button border-0 bg-transparent after:hidden focus-visible:ring-2 data-checked:border-transparent data-checked:bg-transparent [&_[data-slot=radio-group-indicator]]:hidden"
                  >
                    <StarIcon
                      className={
                        value <= stars
                          ? 'fill-current text-warning'
                          : 'text-muted-foreground'
                      }
                    />
                  </RadioGroupItem>
                ))}
              </RadioGroup>
              <Field.Root>
                <Field.Label>
                  <Trans message="Headline (optional)" />
                </Field.Label>
                <Input
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  bindToHookForm={false}
                  maxLength={120}
                />
              </Field.Root>
              <Field.Root>
                <Field.Label>
                  <Trans message="Review (optional)" />
                </Field.Label>
                <Textarea
                  rows={4}
                  value={review}
                  onChange={event => setReview(event.target.value)}
                  bindToHookForm={false}
                  maxLength={5000}
                />
              </Field.Root>
              {error && (
                <Alert variant="destructive" fillStyle="subtleFill">
                  <Alert.Description>
                    {error === 'stars' && (
                      <Trans message="Choose a star rating to continue." />
                    )}
                    {error === 'save' && (
                      <Trans message="We could not save your review." />
                    )}
                    {typeof error === 'object' ? error.api : null}
                  </Alert.Description>
                </Alert>
              )}
            </div>
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" disabled={submitting} onClick={onClose}>
              <Trans message="Cancel" />
            </Button>
            <Button disabled={submitting} onClick={() => void submit()}>
              {submitting && <Spinner />}
              <Trans message="Save review" />
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function OrderCard({
  order,
  busy,
  enrolledCourseIds,
  onDownload,
  onResend,
  onReview,
}: {
  order: Order;
  busy?: string;
  enrolledCourseIds?: Set<number>;
  onDownload: (order: Order, download: OrderDownload) => Promise<void>;
  onResend: (order: Order) => Promise<void>;
  onReview?: () => void;
}) {
  const downloads = order.downloads.filter(download => download.available);
  const isCourse = order.product_type === 'course' || !!order.course_id;
  const canOpenCourse =
    !!order.course_id &&
    (!enrolledCourseIds || enrolledCourseIds.has(order.course_id));

  return (
    <Card.Root className="gap-0 overflow-hidden">
      <Card.Header>
        <Card.Title className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            {isCourse ? (
              <GraduationCapIcon className="size-4 text-primary" />
            ) : (
              <PackageOpenIcon className="size-4 text-primary" />
            )}
            {order.product_title ?? <Trans message="Digital product" />}
            {order.is_demo ? (
              <span className="rounded-sm bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                <Trans message="Sample" />
              </span>
            ) : null}
          </span>
          <span className="text-base tabular-nums">
            {formatPrice(order.gross_amount_cents, order.currency)}
          </span>
        </Card.Title>
        <Card.Description>
          {order.paid_at ? (
            <Trans
              message="Purchased on :date"
              values={{date: <FormattedDate date={order.paid_at} />}}
            />
          ) : (
            <Trans message="Paid purchase" />
          )}
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        {isCourse ? (
          <div className="flex flex-col gap-3 rounded-card border p-3">
            <p className="text-sm text-muted-foreground">
              <Trans message="This purchase is a course. Open it to watch lessons and track your progress." />
            </p>
            {order.course_id ? (
              <Button
                size="sm"
                className="w-fit"
                disabled={!canOpenCourse}
                render={
                  <Link to={`/my-portal/courses/${order.course_id}`} />
                }
              >
                <PlayIcon />
                <Trans message="Open course" />
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Trans message="Course access will appear here after payment is confirmed." />
              </p>
            )}
          </div>
        ) : downloads.length ? (
          <div className="divide-y rounded-card border">
            {downloads.map(download => (
              <div
                key={download.id}
                className="flex items-center gap-3 px-3 py-3"
              >
                <FileDownIcon className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {download.name ?? <Trans message="Download file" />}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    <Trans
                      message=":count left"
                      values={{count: download.remaining_downloads}}
                    />
                  </span>
                </span>
                <Button
                  size="sm"
                  disabled={busy === `download-${download.id}`}
                  onClick={() => void onDownload(order, download)}
                >
                  {busy === `download-${download.id}` ? (
                    <Spinner />
                  ) : (
                    <DownloadIcon />
                  )}
                  <Trans message="Download" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Alert variant="warning" fillStyle="subtleFill">
            <FileDownIcon />
            <Alert.Title>
              <Trans message="Downloads unavailable" />
            </Alert.Title>
            <Alert.Description>
              <Trans message="Your protected download links have expired, were refunded, or have reached their download limit." />
            </Alert.Description>
          </Alert>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
          <span className="text-xs text-muted-foreground">
            {order.receipt_sent_at ? (
              <Trans
                message="Receipt sent :date"
                values={{date: <FormattedDate date={order.receipt_sent_at} />}}
              />
            ) : (
              <Trans message="Receipt available" />
            )}
          </span>
          <div className="flex flex-wrap gap-2">
            {onReview && (
              <Button variant="outline" size="sm" onClick={onReview}>
                <StarIcon />
                {order.review ? (
                  <Trans message="Edit review" />
                ) : (
                  <Trans message="Write a review" />
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              disabled={busy === `receipt-${order.id}`}
              onClick={() => void onResend(order)}
            >
              {busy === `receipt-${order.id}` ? <Spinner /> : <MailIcon />}
              <Trans message="Resend receipt" />
            </Button>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  );
}

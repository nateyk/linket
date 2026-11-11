import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {
  biolinkSurfaceEdgeClassName,
  resolveBiolinkButtonAppearance,
  resolveBiolinkPublicAppearanceStyle,
  shouldUseLightBiolinkLogo,
} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {Background} from '@app/short-links/renderers/biolink-renderer/biolink-background';
import {ProductGallery} from '@app/digital-products/public/product-page/product-gallery';
import {ProductSamplePdf} from '@app/digital-products/public/product-page/product-sample-pdf';
import {
  ProductSamplePlayer,
  ProductSampleStage,
  ProductSampleTracklist,
} from '@app/digital-products/public/product-page/product-sample-player';
import {ProductCreatorCard} from '@app/digital-products/public/product-page/product-creator-card';
import {ProductOverview} from '@app/digital-products/public/product-page/product-overview';
import {ProductPricingCard} from '@app/digital-products/public/product-page/product-pricing-card';
import {isSuccessfulFreeCheckoutResponse} from './free-checkout-response';
import {DirectPaymentModal, type DirectCheckout} from '@app/digital-products/public/direct-payment-modal';
import {ProductSummary} from '@app/digital-products/public/product-page/product-summary';
import {
  ProductTabs,
  type ProductTabSection,
} from '@app/digital-products/public/product-page/product-tabs';
import {
  biolinkSectionTitle,
  biolinkSurfaceCard,
} from '@app/digital-products/public/product-page/surface';
import {Accordion} from '@shadcn/accordion/accordion';
import {Alert} from '@shadcn/alert/alert';
import {Button, buttonVariants} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Spinner} from '@shadcn/spinner/spinner';
import {apiClient} from '@common/http/query-client';
import {loadFonts} from '@ui/fonts/font-picker/load-fonts';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {formatMoney as formatPrice} from '@ui/i18n/format-money';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {useSettings} from '@ui/settings/use-settings';
import {useIsDarkMode} from '@ui/themes/use-is-dark-mode';
import {cn} from '@ui/utils/cn';
import {MotionConfig} from 'framer-motion';
import {
  ArrowLeftIcon,
  BookOpenIcon,
  CheckCircle2Icon,
  ClockIcon,
  DownloadIcon,
  FileDownIcon,
  FileIcon,
  GraduationCapIcon,
  LockKeyholeIcon,
  RefreshCwIcon,
  ShoppingBagIcon,
  XIcon,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {Link} from 'react-router';
import {productTypeIcon} from './product-page/product-type';
import {
  ProductReviewsBlock,
  type ProductReviewsSummary,
} from './product-reviews-block';

export type PublicDigitalProduct = {
  id: number;
  title: string;
  description?: string | null;
  learning_outcomes?: string[] | null;
  price_cents: number;
  can_buy?: boolean;
  verification_quota_exhausted?: boolean;
  payment_mode?: 'direct' | 'free' | 'unavailable';
  receiving_accounts?: Array<{id: number; provider: string; account_ending: string; account_name: string}>;
  currency: string;
  type?: string;
  is_course?: boolean;
  course_id?: number | null;
  lessons_count?: number | null;
  chapters_count?: number | null;
  cover?: {url: string} | null;
  files_count?: number;
  samples?: PublicProductSample[];
};

export type PublicProductSample = {
  id: number;
  title?: string | null;
  kind: 'audio' | 'pdf';
  position: number;
  duration_ms?: number | null;
  url: string;
};

export type PublicBiolink = {
  id: number;
  name: string;
  short_url?: string | null;
  is_verified?: boolean;
  profile_config?: {
    display_name?: string | null;
    avatar_url?: string | null;
  } | null;
};

export type PublicCreator = {
  name?: string | null;
  avatar?: string | null;
  verified?: boolean;
};

export type DigitalProductPageData = {
  biolink: PublicBiolink;
  appearance?: BiolinkAppearanceConfig | null;
  creator?: PublicCreator | null;
  product: PublicDigitalProduct;
  checkout_endpoint?: string;
  back_url?: string | null;
  reviews_enabled?: boolean;
};

export type DigitalProductDownload = {
  id: number | string;
  name: string;
  url: string;
  remaining_downloads?: number | null;
};

export type DigitalProductOrder = {
  id: string;
  uuid: string;
  status: string;
  payment_status?: string;
  buyer_name?: string | null;
  buyer_email?: string | null;
  currency?: string;
  gross_amount_cents?: number;
  paid_at?: string | null;
  product_title?: string | null;
  downloads?: DigitalProductDownload[];
};

export type DigitalProductOrderSuccessPageData = DigitalProductPageData & {
  order: DigitalProductOrder;
  status_endpoint?: string;
};

export function PublicDigitalProductPage({
  data,
}: {
  data: DigitalProductPageData;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [buyerDialogOpen, setBuyerDialogOpen] = useState(false);
  const [freeCheckoutComplete, setFreeCheckoutComplete] = useState(false);
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState<number | undefined>();
  const [buyerError, setBuyerError] = useState<'name' | 'email'>();
  const [checkoutFailed, setCheckoutFailed] = useState(false);
  const [directCheckout, setDirectCheckout] = useState<DirectCheckout | null>(null);
  const [reviewsSummary, setReviewsSummary] = useState<ProductReviewsSummary>();
  const checkoutCancelled =
    new URLSearchParams(window.location.search).get('checkout') === 'cancelled';
  const buttonAppearance = resolveBiolinkButtonAppearance(data.appearance);
  const buyActionRef = useRef<HTMLDivElement | null>(null);
  const [railInView, setRailInView] = useState(true);

  // The pricing rail is only sticky from lg up, so on phones the buy
  // action scrolls away while the rest of the rail (includes, trust note)
  // is still on screen. Watch the button itself. A cancelled or failed
  // return also keeps the bar up. The bar steps aside while the buyer
  // dialog is open.
  useEffect(() => {
    const action = buyActionRef.current;
    if (!action || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => setRailInView(entry.isIntersecting),
      {threshold: 0},
    );
    observer.observe(action);
    return () => observer.disconnect();
  }, []);

  const beginCheckout = async () => {
    // A completed free claim must never be re-submitted (also guard rapid
    // double-clicks while the first checkout request is in flight).
    if (submitting || freeCheckoutComplete) return;
    if (buyerName.trim().length < 2) {
      setBuyerError('name');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(buyerEmail.trim())) {
      setBuyerError('email');
      return;
    }
    if (data.product.payment_mode === 'unavailable') {
      setCheckoutFailed(true);
      return;
    }
    if (data.product.payment_mode === 'direct' && (data.product.receiving_accounts?.length ?? 0) > 1 && !paymentMethodId) {
      setCheckoutFailed(true);
      return;
    }

    setSubmitting(true);
    setCheckoutFailed(false);
    setBuyerError(undefined);

    try {
      const response = await apiClient.post(
        data.checkout_endpoint ??
          `/api/v1/digital-products/${data.product.id}/checkout`,
        {
          buyer_name: buyerName.trim(),
          buyer_email: buyerEmail.trim(),
          buyer_phone: buyerPhone.trim() || undefined,
          creator_payment_method_id: paymentMethodId,
        },
      );
      const payload = response.data;

      // The server fulfills free orders before returning HTTP 200, even if
      // Verify.et response fields still contain legacy "pending_payment"
      // instructions. Free buyers should not enter the paid verification UI.
      if (data.product.payment_mode === 'free') {
        if (!isSuccessfulFreeCheckoutResponse(data.product.payment_mode, payload)) {
          throw new Error('Free checkout response missing order id.');
        }
        setBuyerDialogOpen(false);
        setFreeCheckoutComplete(true);
        setSubmitting(false);
        return;
      }

      const checkoutUrl = payload?.checkout_url ?? payload?.data?.checkout_url;
      if (payload?.reference_endpoint && payload?.access_token) {
        setDirectCheckout(payload as DirectCheckout);
        setBuyerDialogOpen(false);
        setSubmitting(false);
        return;
      }

      if (typeof checkoutUrl !== 'string') {
        throw new Error('Checkout could not be started.');
      }

      window.location.assign(checkoutUrl);
    } catch {
      setCheckoutFailed(true);
      setSubmitting(false);
    }
  };

  const audioSamples = (data.product.samples ?? []).filter(
    sample => sample.kind === 'audio' && sample.url,
  );
  const pdfSample = (data.product.samples ?? []).find(
    sample => sample.kind === 'pdf' && sample.url,
  );
  const reviewsEnabled = data.reviews_enabled !== false;
  const tabSections: ProductTabSection[] = [];

  // The overview card always renders: even with no description or learning
  // outcomes it carries the system FAQ (receipt, My Orders portal, formats,
  // guest checkout), which must stay reachable pre-purchase.
  tabSections.push({
    value: 'overview',
    label: <Trans message="Overview" />,
    content: <ProductOverview product={data.product} />,
  });

  if (data.product.is_course && data.product.course_id) {
    tabSections.push({
      value: 'curriculum',
      label: <Trans message="Curriculum" />,
      content: (
        <CourseCurriculum
          courseId={data.product.course_id}
          appearance={data.appearance}
        />
      ),
    });
  }

  if (reviewsEnabled) {
    tabSections.push({
      value: 'reviews',
      label: <Trans message="Reviews" />,
      content: (
        <Card.Root className={biolinkSurfaceCard}>
          <Card.Content className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
            <ProductReviewsBlock
              product={data.product}
              biolinkId={data.biolink.id}
              appearance={data.appearance}
              onSummary={setReviewsSummary}
            />
          </Card.Content>
        </Card.Root>
      ),
    });
  }

  tabSections.push({
    value: 'creator',
    label: <Trans message="Creator" />,
    content: (
      <ProductCreatorCard
        creator={data.creator}
        biolink={data.biolink}
        storeUrl={data.back_url}
        appearance={data.appearance}
      />
    ),
  });

  return (
    <PublicProductShell
      appearance={data.appearance}
      backUrl={data.back_url}
      backLabel={<Trans message="Back to bio" />}
      wide
    >
      <div
        className="flex w-full flex-col gap-4 pb-24 sm:gap-5 lg:pb-0"
        // The buyer dialog is a true modal (Dialog.Root defaults to
        // modal, re-stated below): while it is open the page behind must
        // never be focusable or operable — belt-and-suspenders alongside
        // Base UI's own focus trap, so a keyboard/SR buyer cannot reach the
        // very Buy button the dialog sits on.
        inert={buyerDialogOpen || undefined}
      >
        {freeCheckoutComplete && (
          <section
            role="status"
            aria-live="polite"
            className={cn(
              'flex min-w-0 flex-wrap items-center justify-between gap-4 rounded-card bg-[var(--biolink-surface-strong)] p-4 text-[var(--biolink-text)] [box-shadow:var(--biolink-surface-shadow,none)]',
              biolinkSurfaceEdgeClassName,
            )}
          >
            <div className="flex min-w-0 items-start gap-3">
              <CheckCircle2Icon
                className="mt-0.5 size-5 shrink-0 text-positive"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-base font-semibold">
                  <Trans message="Your free order is ready" />
                </p>
                <p className="text-sm text-[var(--biolink-muted-text)] break-words [overflow-wrap:anywhere]">
                  <Trans message="Use your checkout email in My Portal to access your product." />
                </p>
              </div>
            </div>
            <Link
              to="/my-portal"
              className={cn(
                buttonVariants({variant: 'outline', size: 'lg'}),
                'min-h-11 shrink-0',
              )}
            >
              <Trans message="Open My Portal" />
            </Link>
          </section>
        )}
        <ProductSamplePlayer samples={audioSamples}>
        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-6">
          <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1">
            <Card.Root className={biolinkSurfaceCard}>
              {audioSamples.length > 0 ? (
                <ProductSampleStage product={data.product} />
              ) : (
                <ProductGallery product={data.product} />
              )}
              <Card.Content className="flex min-w-0 flex-col gap-6 p-5 sm:p-7">
                <ProductSummary
                  product={data.product}
                  creator={data.creator}
                  biolink={data.biolink}
                  reviews={reviewsSummary}
                />
              </Card.Content>
              {audioSamples.length > 0 && <ProductSampleTracklist />}
            </Card.Root>
          </div>

          <aside className="min-w-0 lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <ProductPricingCard
              product={data.product}
              appearance={data.appearance}
              checkoutCancelled={checkoutCancelled}
              checkoutFailed={checkoutFailed}
              submitting={submitting}
              completed={freeCheckoutComplete}
              onBuy={() => setBuyerDialogOpen(true)}
              actionRef={buyActionRef}
            />
          </aside>

          <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-2">
            {pdfSample && <ProductSamplePdf sample={pdfSample} />}
            <ProductTabs
              sections={tabSections}
              appearance={data.appearance}
            />
          </div>
        </div>
        </ProductSamplePlayer>

        <div
          className={cn(
            'fixed inset-x-0 bottom-0 z-30 border-t border-[var(--biolink-border)] bg-[var(--biolink-surface-strong)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] [box-shadow:var(--biolink-surface-shadow,none)] transition-[transform,visibility] duration-150 ease-in-out motion-reduce:transition-none lg:hidden',
            freeCheckoutComplete
              ? 'invisible translate-y-full'
              : !railInView || checkoutCancelled || checkoutFailed
                ? buyerDialogOpen
                  ? 'invisible translate-y-full'
                  : 'visible translate-y-0'
                : 'invisible translate-y-full',
          )}
        >
          <div className="flex items-center justify-between gap-4">
            <span className="min-w-0 truncate text-base font-semibold tabular-nums">
              {data.product.payment_mode === 'free' ? (
                <Trans message="Free" />
              ) : (
                formatPrice(data.product.price_cents, data.product.currency)
              )}
            </span>
            <Button
              variant="ghost"
              className={cn('shrink-0', buttonAppearance.className)}
              style={buttonAppearance.style}
              size="lg"
              disabled={submitting || data.product.can_buy === false || freeCheckoutComplete}
              onClick={() => setBuyerDialogOpen(true)}
            >
              {data.product.payment_mode === 'free' ? (
                <ShoppingBagIcon aria-hidden="true" />
              ) : (
                <LockKeyholeIcon aria-hidden="true" />
              )}
              {data.product.verification_quota_exhausted ? (
                <Trans message="Creator cannot accept additional verified sales right now" />
              ) : data.product.can_buy === false ? (
                <Trans message="Temporarily unavailable" />
              ) : data.product.payment_mode === 'free' ? (
                <Trans message="Get for free" />
              ) : (
                <Trans message="Buy now" />
              )}
            </Button>
          </div>
        </div>
      </div>
      <BuyerDetailsDialog
        appearance={data.appearance}
        product={data.product}
        biolink={data.biolink}
        creator={data.creator}
        open={buyerDialogOpen}
        submitting={submitting}
        name={buyerName}
        email={buyerEmail}
        phone={buyerPhone}
        paymentMethodId={paymentMethodId}
        error={buyerError}
        onOpenChange={setBuyerDialogOpen}
        onNameChange={setBuyerName}
        onEmailChange={setBuyerEmail}
        onPhoneChange={setBuyerPhone}
        onPaymentMethodChange={setPaymentMethodId}
        onSubmit={() => void beginCheckout()}
      />
      <DirectPaymentModal checkout={directCheckout} onClose={() => setDirectCheckout(null)} />
    </PublicProductShell>
  );
}

export function PublicDigitalProductOrderSuccessPage({
  data,
}: {
  data: DigitalProductOrderSuccessPageData;
}) {
  const [order, setOrder] = useState(data.order);
  const [refreshError, setRefreshError] = useState(false);
  const paid = isPaid(order);
  const isCourse = !!data.product.is_course;
  const buttonAppearance = resolveBiolinkButtonAppearance(data.appearance);

  const refreshOrder = useCallback(async () => {
    setRefreshError(false);

    if (!data.status_endpoint) {
      window.location.reload();
      return;
    }

    try {
      const {data: payload} = await apiClient.get(data.status_endpoint);
      const nextOrder = payload?.data?.order ?? payload?.order ?? payload?.data;
      if (nextOrder && typeof nextOrder === 'object') {
        setOrder(current => ({...current, ...nextOrder}));
      }
    } catch {
      setRefreshError(true);
    }
  }, [data.status_endpoint]);

  useEffect(() => {
    if (paid) return;
    const timer = window.setInterval(() => void refreshOrder(), 3000);
    return () => window.clearInterval(timer);
  }, [paid, refreshOrder]);

  return (
    <PublicProductShell
      appearance={data.appearance}
      backUrl={data.back_url}
      backLabel={<Trans message="Back to bio" />}
    >
      <Card.Root className={cn('w-full', biolinkSurfaceCard)}>
        <div
          className={cn(
            'border-b border-[var(--biolink-border)] px-5 py-5 sm:px-6',
            paid
              ? 'bg-positive/10'
              : 'bg-[color-mix(in_srgb,var(--biolink-accent,var(--color-primary))_12%,transparent)]',
          )}
        >
          {paid ? (
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-button bg-positive/10 text-positive">
                <CheckCircle2Icon className="size-5" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="text-xl font-semibold tracking-tight">
                  {isCourse ? (
                    <Trans message="Your course is ready" />
                  ) : (
                    <Trans message="Your download is ready" />
                  )}
                </h1>
                <p className="text-sm text-[var(--biolink-muted-text)]">
                  <Trans
                    message="Thanks for your purchase of :product."
                    values={{product: data.product.title}}
                  />
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-button bg-[color-mix(in_srgb,var(--biolink-accent,var(--color-primary))_12%,transparent)] text-[var(--biolink-accent,var(--color-primary))]">
                <Spinner className="size-5" />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h1 className="text-xl font-semibold tracking-tight">
                  <Trans message="Finalizing your payment" />
                </h1>
                <p className="text-sm text-[var(--biolink-muted-text)]">
                  <Trans message="This usually takes just a few seconds. Keep this page open." />
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-5 p-5 sm:p-6">
          {order.buyer_email && (
            <p className="text-sm text-[var(--biolink-muted-text)]">
              <Trans
                message="Your receipt is being sent to :email."
                values={{email: order.buyer_email}}
              />
            </p>
          )}

          <OrderSummary order={order} product={data.product} paid={paid} />

          {paid ? (
            <>
              {isCourse && (
                <p className="text-sm leading-6 text-[var(--biolink-muted-text)]">
                  <Trans message="Sign in with the email you used at checkout. The course is listed under My courses." />
                </p>
              )}
              {(!isCourse || (order.downloads?.length ?? 0) > 0) && (
                <DownloadList
                  appearance={data.appearance}
                  downloads={order.downloads ?? []}
                />
              )}
              {isCourse ? (
                <Button
                  variant="ghost"
                  className={cn('w-fit', buttonAppearance.className)}
                  style={buttonAppearance.style}
                  render={<a href="/my-portal" />}
                >
                  <Trans message="Open My Portal" />
                </Button>
              ) : (
                <p className="text-sm text-[var(--biolink-muted-text)]">
                  <Trans
                    message="Find this purchase later in :link."
                    values={{
                      link: (
                        <a
                          href="/my-portal"
                          className="font-medium text-[var(--biolink-text)] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4"
                        >
                          <Trans message="My Portal" />
                        </a>
                      ),
                    }}
                  />
                </p>
              )}
            </>
          ) : (
            <PendingOrderState
              appearance={data.appearance}
              failed={refreshError}
              onRetry={() => void refreshOrder()}
            />
          )}
        </div>
      </Card.Root>
    </PublicProductShell>
  );
}

function BuyerDetailsDialog({
  appearance,
  product,
  biolink,
  creator,
  open,
  submitting,
  name,
  email,
  phone,
  paymentMethodId,
  error,
  onOpenChange,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onPaymentMethodChange,
  onSubmit,
}: {
  appearance?: BiolinkAppearanceConfig | null;
  product: PublicDigitalProduct;
  biolink: PublicBiolink;
  creator?: PublicCreator | null;
  open: boolean;
  submitting: boolean;
  name: string;
  email: string;
  phone: string;
  paymentMethodId?: number;
  error?: 'name' | 'email';
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onPaymentMethodChange: (value: number | undefined) => void;
  onSubmit: () => void;
}) {
  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);
  const {trans} = useTrans();
  const TypeIcon = productTypeIcon(product.type);
  // Store identity for the payment moment: the buyer sees who takes the
  // card before handing over PII — never an anonymous checkout.
  const storeName =
    biolink.profile_config?.display_name || creator?.name || biolink.name;
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  // Validation errors are announced (Field.Error) but focus used to stay on
  // the submit button — move it to the offending field so keyboard and SR
  // buyers land where the fix happens.
  useEffect(() => {
    if (!open) return;
    if (error === 'name') {
      nameInputRef.current?.focus();
    } else if (error === 'email') {
      emailInputRef.current?.focus();
    }
  }, [error, open]);

  // Initial focus belongs in the dialog, on the first field, the moment it
  // opens — a visible stop that also proves the modal trap engaged.
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      (nameInputRef.current ?? emailInputRef.current)?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  return (
    <Dialog.Root
      open={open}
      // Explicit: payment is a true modal — focus is trapped, page scroll is
      // locked, outside pointer interaction is disabled. Never weaken this
      // to 'trap-focus' or false: the page behind holds a live Buy button.
      modal
      onOpenChange={nextOpen => {
        if (!submitting || nextOpen) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content
          showCloseButton={false}
          className="bg-[var(--biolink-surface-strong)] text-[var(--biolink-text)] sm:max-w-md"
          style={resolveBiolinkPublicAppearanceStyle(appearance)}
        >
          <Dialog.CloseButton
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="absolute inset-e-4 top-4"
              />
            }
            disabled={submitting}
            aria-label={trans({message: 'Close dialog'})}
          >
            <XIcon />
          </Dialog.CloseButton>
          <Dialog.Header>
            <Dialog.Title className="pe-11">
              <LockKeyholeIcon />
              <Trans message="Complete your purchase" />
            </Dialog.Title>
            <div
              className={cn(
                'flex items-center gap-3 rounded-card-xs bg-[var(--biolink-surface)] px-3 py-2.5',
                biolinkSurfaceEdgeClassName,
              )}
            >
              {product.cover?.url ? (
                <img
                  src={product.cover.url}
                  alt=""
                  className="size-10 shrink-0 rounded-card-xs object-cover"
                />
              ) : (
                <span className="grid size-10 shrink-0 place-items-center rounded-card-xs bg-[var(--biolink-surface-strong)] text-[var(--biolink-muted-text)] ring-1 ring-(color:--biolink-border)">
                  <TypeIcon className="size-5" aria-hidden="true" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{product.title}</p>
                <p className="truncate text-xs font-medium text-[var(--biolink-muted-text)]">
                  <Trans message="Sold by :store" values={{store: storeName}} />
                </p>
              </div>
              <div className="shrink-0 text-end">
                <p className="text-xs font-medium text-[var(--biolink-muted-text)]">
                  <Trans message="Total" />
                </p>
                <p className="text-sm font-semibold tabular-nums">
                  {formatPrice(product.price_cents, product.currency)}
                </p>
              </div>
            </div>
            <Dialog.Description className="text-[var(--biolink-muted-text)]">
              {product.payment_mode === 'direct'
                ? <Trans message="You'll pay the creator directly using their bank or wallet details." />
                : <Trans message="Checkout is temporarily unavailable." />}
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            <form
              id="digital-product-buyer-details"
              className="flex flex-col gap-4 px-0.5 py-1"
              onSubmit={event => {
                event.preventDefault();
                onSubmit();
              }}
            >
              <Field.Root invalid={error === 'name' ? true : undefined}>
                <Field.Label>
                  <Trans message="Name" />
                </Field.Label>
                <Input
                  ref={nameInputRef}
                  aria-invalid={error === 'name' ? true : undefined}
                  aria-describedby={
                    error === 'name'
                      ? 'digital-product-buyer-name-error'
                      : undefined
                  }
                  className="border-[var(--biolink-border)] bg-[var(--biolink-surface)] text-[var(--biolink-text)]"
                  bindToHookForm={false}
                  autoComplete="name"
                  value={name}
                  onChange={event => onNameChange(event.target.value)}
                />
                {error === 'name' && (
                  <Field.Error id="digital-product-buyer-name-error">
                    <Trans message="Enter your name to continue." />
                  </Field.Error>
                )}
              </Field.Root>
              <Field.Root invalid={error === 'email' ? true : undefined}>
                <Field.Label>
                  <Trans message="Email" />
                </Field.Label>
                <Input
                  ref={emailInputRef}
                  aria-invalid={error === 'email' ? true : undefined}
                  aria-describedby={
                    error === 'email'
                      ? 'digital-product-buyer-email-error'
                      : undefined
                  }
                  className="border-[var(--biolink-border)] bg-[var(--biolink-surface)] text-[var(--biolink-text)]"
                  bindToHookForm={false}
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={event => onEmailChange(event.target.value)}
                />
                {error === 'email' && (
                  <Field.Error id="digital-product-buyer-email-error">
                    <Trans message="Enter a valid email address to receive your receipt." />
                  </Field.Error>
                )}
              </Field.Root>
              <Field.Root>
                <Field.Label>
                  <Trans message="Phone (optional)" />
                </Field.Label>
                <Input
                  className="border-[var(--biolink-border)] bg-[var(--biolink-surface)] text-[var(--biolink-text)]"
                  bindToHookForm={false}
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={event => onPhoneChange(event.target.value)}
                />
                <Field.Description className="text-[var(--biolink-muted-text)]">
                  {product.payment_mode === 'direct'
                    ? <Trans message="Used only to help with your order." />
                    : <Trans message="Checkout is temporarily unavailable." />}
                </Field.Description>
              </Field.Root>
              {product.payment_mode === 'direct' && (product.receiving_accounts?.length ?? 0) > 1 && (
                <Field.Root>
                  <Field.Label><Trans message="Payment destination" /></Field.Label>
                  <select className="h-10 rounded-input border border-[var(--biolink-border)] bg-[var(--biolink-surface)] px-3 text-sm text-[var(--biolink-text)]" value={paymentMethodId ?? ''} onChange={event => onPaymentMethodChange(event.target.value ? Number(event.target.value) : undefined)}>
                    <option value=""><Trans message="Choose an account" /></option>
                    {product.receiving_accounts?.map(account => <option key={account.id} value={account.id}>{account.provider.toUpperCase()} · {account.account_name} · {account.account_ending}</option>)}
                  </select>
                </Field.Root>
              )}
              <ul className="flex flex-col gap-2 border-t border-[var(--biolink-border)] pt-4 text-sm text-[var(--biolink-muted-text)]">
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon
                    className="mt-0.5 size-4 shrink-0 text-positive"
                    aria-hidden="true"
                  />
                  <Trans message="One-time payment, no subscription." />
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon
                    className="mt-0.5 size-4 shrink-0 text-positive"
                    aria-hidden="true"
                  />
                  <Trans message="We email your receipt and protected download links as soon as payment is confirmed." />
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2Icon
                    className="mt-0.5 size-4 shrink-0 text-positive"
                    aria-hidden="true"
                  />
                  <Trans message="Digital delivery is instant; refunds are at the creator's discretion." />
                </li>
              </ul>
            </form>
          </Dialog.Body>
          <Dialog.Footer
            className="border-[var(--biolink-border)] bg-[var(--biolink-surface)]"
            variant="muted"
          >
            <Dialog.CloseButton
              className="border-[var(--biolink-border)] bg-transparent text-[var(--biolink-text)]"
              disabled={submitting}
            >
              <Trans message="Cancel" />
            </Dialog.CloseButton>
            <Button
              form="digital-product-buyer-details"
              type="submit"
              variant="ghost"
              className={buttonAppearance.className}
              style={buttonAppearance.style}
              disabled={submitting || product.payment_mode === 'unavailable'}
            >
              {submitting ? <Spinner /> : <LockKeyholeIcon />}
              <Trans
                message={
                  submitting
                    ? 'Starting checkout...'
                    : product.payment_mode === 'direct'
                      ? 'Show payment details'
                      : 'Checkout unavailable'
                }
              />
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function OrderSummary({
  order,
  product,
  paid,
}: {
  order: DigitalProductOrder;
  product: PublicDigitalProduct;
  paid: boolean;
}) {
  const {trans} = useTrans();
  const total =
    typeof order.gross_amount_cents === 'number'
      ? formatPrice(
          order.gross_amount_cents,
          order.currency ?? product.currency,
        )
      : formatPrice(product.price_cents, product.currency);

  return (
    <section
      className={cn(
        'divide-y divide-[var(--biolink-border)] rounded-card',
        biolinkSurfaceEdgeClassName,
      )}
      aria-label={trans({message: 'Order summary'})}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <span className="text-[var(--biolink-muted-text)]">
          <Trans message="Product" />
        </span>
        <span className="text-end font-medium">
          {order.product_title ?? product.title}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <span className="text-[var(--biolink-muted-text)]">
          {paid ? <Trans message="Total paid" /> : <Trans message="Total" />}
        </span>
        <span className="font-medium">{total}</span>
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
        <span className="text-[var(--biolink-muted-text)]">
          <Trans message="Order reference" />
        </span>
        <span
          className="max-w-48 truncate font-mono text-xs"
          title={order.id ?? order.uuid}
        >
          {shortReference(order.id ?? order.uuid)}
        </span>
      </div>
      {order.paid_at && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
          <span className="text-[var(--biolink-muted-text)]">
            <Trans message="Paid" />
          </span>
          <span>
            <FormattedDate
              date={order.paid_at}
              options={{dateStyle: 'medium', timeStyle: 'short'}}
            />
          </span>
        </div>
      )}
    </section>
  );
}

function PublicProductShell({
  appearance,
  backUrl,
  backLabel,
  wide = false,
  children,
}: {
  appearance?: BiolinkAppearanceConfig | null;
  backUrl?: string | null;
  backLabel: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!appearance?.fontConfig) return;
    // Painted fonts render at 400/500/600 in this UI (body, titles, prices)
    // — load every weight the page computes so Oswald never falls back to
    // synthesized bold in its condensed face.
    loadFonts([appearance.fontConfig], {
      id: 'digital-product-fonts',
      weights: [400, 500, 600, 700],
    });
  }, [appearance?.fontConfig]);

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="relative isolate min-h-screen px-4 py-5 text-[var(--biolink-text)] sm:px-6 sm:py-10"
        style={resolveBiolinkPublicAppearanceStyle(appearance)}
      >
        <Background appearance={appearance ?? null} className="inset-0 -z-10" />
        <main
          className={cn(
            'relative mx-auto flex w-full flex-col gap-4',
            wide ? 'max-w-5xl' : 'max-w-xl',
          )}
        >
          <BackToBio backUrl={backUrl}>{backLabel}</BackToBio>
          {children}
          <ProductBranding appearance={appearance} />
        </main>
      </div>
    </MotionConfig>
  );
}

function ProductBranding({
  appearance,
}: {
  appearance?: BiolinkAppearanceConfig | null;
}) {
  const {branding, biolink} = useSettings();
  const {trans} = useTrans();
  const isDarkMode = useIsDarkMode();
  const useLightLogo = shouldUseLightBiolinkLogo(appearance, isDarkMode);
  const src =
    biolink?.branding_img ||
    (useLightLogo
      ? branding.logo_light_mobile || branding.logo_light
      : branding.logo_dark_mobile || branding.logo_dark);

  if (!src || appearance?.hideBranding) {
    return null;
  }

  return (
    <div className="flex justify-center pt-2 pb-1">
      <Link
        to="/"
        aria-label={branding.site_name}
        className="inline-flex items-center justify-center gap-1.5"
      >
        <img
          className="h-4.5 w-auto"
          src={src}
          alt={trans(message(':site logo', {values: {site: branding.site_name}}))}
        />
      </Link>
    </div>
  );
}

function BackToBio({
  backUrl,
  children,
}: {
  backUrl?: string | null;
  children: ReactNode;
}) {
  const className = cn(
    'inline-flex h-9 w-fit items-center gap-2 self-start rounded-button bg-[var(--biolink-surface-strong)] px-3 text-sm font-medium text-[var(--biolink-text)] [box-shadow:var(--biolink-surface-shadow,none)] transition-colors hover:bg-[var(--biolink-surface)] focus-visible:outline-2 focus-visible:outline-offset-4',
    biolinkSurfaceEdgeClassName,
  );

  if (backUrl) {
    return (
      <a className={className} href={backUrl}>
        <ArrowLeftIcon className="size-4" />
        {children}
      </a>
    );
  }

  return (
    <button
      className={className}
      type="button"
      onClick={() => window.history.back()}
    >
      <ArrowLeftIcon className="size-4" />
      {children}
    </button>
  );
}

function PendingOrderState({
  appearance,
  failed,
  onRetry,
}: {
  appearance?: BiolinkAppearanceConfig | null;
  failed: boolean;
  onRetry: () => void;
}) {
  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);

  return (
    <div className="rounded-card border border-dashed px-4 py-5 text-center">
      {failed ? (
        <>
          <p className="text-sm font-medium">
            <Trans message="We could not refresh your payment status." />
          </p>
          <p className="mt-1 text-sm text-[var(--biolink-muted-text)]">
            <Trans message="Your payment is safe. Try again in a moment." />
          </p>
          <Button
            className={cn('mt-4', buttonAppearance.className)}
            style={buttonAppearance.style}
            variant="ghost"
            onClick={onRetry}
          >
            <RefreshCwIcon />
            <Trans message="Refresh status" />
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">
            <Trans message="Checking for payment confirmation..." />
          </p>
          <p className="mt-1 text-sm text-[var(--biolink-muted-text)]">
            <Trans message="Your download links will appear here automatically." />
          </p>
        </>
      )}
    </div>
  );
}

function DownloadList({
  appearance,
  downloads,
}: {
  appearance?: BiolinkAppearanceConfig | null;
  downloads: DigitalProductDownload[];
}) {
  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);

  if (!downloads.length) {
    return (
      <Alert
        variant="warning"
        fillStyle="subtleFill"
        className="border-[var(--biolink-border,var(--color-border))]!"
      >
        <FileIcon className="text-[var(--biolink-muted-text,var(--color-muted-foreground))]!" />
        <Alert.Title>
          <Trans message="Your files are being prepared" />
        </Alert.Title>
        <Alert.Description className="text-[var(--biolink-muted-text,var(--color-muted-foreground))]!">
          <Trans message="Please refresh this page in a moment." />
        </Alert.Description>
      </Alert>
    );
  }

  return (
    <section aria-labelledby="digital-product-downloads">
      <div className="mb-3 flex items-center gap-2">
        <DownloadIcon className="size-4 text-[var(--biolink-text)]" />
        <h2 id="digital-product-downloads" className="text-sm font-medium">
          <Trans message="Your downloads" />
        </h2>
      </div>
      <div
        className={cn(
          'divide-y divide-[var(--biolink-border)] rounded-card',
          biolinkSurfaceEdgeClassName,
        )}
      >
        {downloads.map(download => (
          <div
            key={download.id}
            className="flex items-center gap-3 px-4 py-3 first:rounded-t-card last:rounded-b-card"
          >
            <FileDownIcon className="size-4 shrink-0 text-[var(--biolink-muted-text)]" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">
                {download.name}
              </span>
              {typeof download.remaining_downloads === 'number' && (
                <span className="text-xs text-[var(--biolink-muted-text)]">
                  <Trans
                    message=":count left"
                    values={{count: download.remaining_downloads}}
                  />
                </span>
              )}
            </span>
            <Button
              className={buttonAppearance.className}
              size="sm"
              style={buttonAppearance.style}
              variant="ghost"
              render={<a href={download.url} />}
            >
              <DownloadIcon />
              <Trans message="Download" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

type CurriculumLesson = {
  id: number;
  title: string;
  duration_seconds?: number | null;
};
type CurriculumChapter = {
  id: number;
  title: string;
  lessons: CurriculumLesson[];
};

function DurationLabel({totalSeconds}: {totalSeconds: number}) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  if (hours > 0) {
    return (
      <Trans
        message=":hours hr :minutes min"
        values={{
          hours,
          minutes: String(minutes).padStart(2, '0'),
        }}
      />
    );
  }
  return <Trans message=":minutes min" values={{minutes}} />;
}

type CurriculumStatus = 'error' | 'loading' | 'ready';

function CourseCurriculum({
  courseId,
  appearance,
}: {
  courseId: number;
  appearance?: BiolinkAppearanceConfig | null;
}) {
  const [curriculum, setCurriculum] = useState<null | {
    chapters: CurriculumChapter[];
  }>(null);
  const [status, setStatus] = useState<CurriculumStatus>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setCurriculum(null);
    void (async () => {
      try {
        const {data: payload} = await apiClient.get(
          `/api/v1/public/courses/${courseId}/curriculum`,
        );
        if (!active) return;
        setCurriculum(payload.data ?? payload);
        setStatus('ready');
      } catch {
        // The tab stays registered whatever happens, so a failed fetch has to
        // render a way out instead of a panel with nothing in it.
        if (active) setStatus('error');
      }
    })();
    return () => {
      active = false;
    };
  }, [courseId, attempt]);

  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);
  const chapters = curriculum?.chapters ?? [];

  if (status === 'loading') {
    return (
      <CurriculumStateCard>
        <div className="flex flex-col items-center gap-3 rounded-card border border-dashed px-4 py-8 text-center">
          <Spinner className="size-5 text-[var(--biolink-muted-text)]" />
          <p className="text-sm text-[var(--biolink-muted-text)]">
            <Trans message="Loading the course curriculum..." />
          </p>
        </div>
      </CurriculumStateCard>
    );
  }

  if (status === 'error') {
    return (
      <CurriculumStateCard>
        <div className="flex flex-col items-center gap-1 rounded-card border border-dashed px-4 py-6 text-center">
          <p className="text-sm font-medium">
            <Trans message="We could not load the course curriculum." />
          </p>
          <p className="text-sm text-[var(--biolink-muted-text)]">
            <Trans message="It may still be publishing. Try again in a moment." />
          </p>
          <Button
            variant="ghost"
            className={cn('mt-3', buttonAppearance.className)}
            style={buttonAppearance.style}
            onClick={() => setAttempt(current => current + 1)}
          >
            <RefreshCwIcon />
            <Trans message="Try again" />
          </Button>
        </div>
      </CurriculumStateCard>
    );
  }

  if (!chapters.length) {
    return (
      <CurriculumStateCard>
        <p className="rounded-card border border-dashed px-4 py-6 text-center text-sm text-[var(--biolink-muted-text)]">
          <Trans message="No chapters have been published yet." />
        </p>
      </CurriculumStateCard>
    );
  }

  const lessonCount = chapters.reduce(
    (total, chapter) => total + chapter.lessons.length,
    0,
  );
  const timedLessonCount = chapters.reduce(
    (total, chapter) =>
      total +
      chapter.lessons.filter(lesson => (lesson.duration_seconds ?? 0) > 0)
        .length,
    0,
  );
  // Only surface a total when every lesson carries a real duration, so the
  // strip never understates a partially timed course.
  const hasFullDurations = lessonCount > 0 && timedLessonCount === lessonCount;
  const totalSeconds = chapters.reduce(
    (total, chapter) =>
      total +
      chapter.lessons.reduce(
        (sum, lesson) => sum + (lesson.duration_seconds ?? 0),
        0,
      ),
    0,
  );

  return (
    <Card.Root className={biolinkSurfaceCard}>
      <Card.Content className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h2 className={biolinkSectionTitle}>
            <Trans message="Course curriculum" />
          </h2>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-[var(--biolink-muted-text)]">
            <span className="inline-flex items-center gap-1.5">
              <BookOpenIcon className="size-3.5" aria-hidden="true" />
              <Trans
                message="[one :count chapter|other :count chapters]"
                values={{count: chapters.length}}
              />
            </span>
            <span className="inline-flex items-center gap-1.5">
              <GraduationCapIcon className="size-3.5" aria-hidden="true" />
              <Trans
                message="[one :count lesson|other :count lessons]"
                values={{count: lessonCount}}
              />
            </span>
            {hasFullDurations && totalSeconds > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <ClockIcon className="size-3.5" aria-hidden="true" />
                <DurationLabel totalSeconds={totalSeconds} />
              </span>
            )}
          </div>
        </div>

        <Accordion.Root
          defaultValue={[String(chapters[0].id)]}
          className="flex flex-col gap-2"
        >
          {chapters.map((chapter, index) => {
            const chapterSeconds = chapter.lessons.reduce(
              (sum, lesson) => sum + (lesson.duration_seconds ?? 0),
              0,
            );
            const chapterIsTimed =
              chapter.lessons.length > 0 &&
              chapter.lessons.every(
                lesson => (lesson.duration_seconds ?? 0) > 0,
              );

            return (
              <Accordion.Item
                key={chapter.id}
                value={String(chapter.id)}
                className={cn(
                  'rounded-card bg-[var(--biolink-surface)]',
                  biolinkSurfaceEdgeClassName,
                )}
              >
                <Accordion.Trigger>
                  <span className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-card-xs bg-[var(--biolink-surface-strong)] text-xs font-semibold text-[var(--biolink-text)] tabular-nums ring-1 ring-(color:--biolink-border)">
                      {index + 1}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-start sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                      <span className="truncate text-sm font-medium text-[var(--biolink-text)]">
                        {chapter.title}
                      </span>
                      <span className="shrink-0 text-xs font-normal text-[var(--biolink-muted-text)]">
                        <Trans
                          message="[one :count lesson|other :count lessons]"
                          values={{count: chapter.lessons.length}}
                        />
                        {chapterIsTimed && (
                          <>
                            {' · '}
                            <DurationLabel totalSeconds={chapterSeconds} />
                          </>
                        )}
                      </span>
                    </span>
                  </span>
                </Accordion.Trigger>
                <Accordion.Content className="px-3 pb-3.5">
                  {chapter.lessons.length > 0 ? (
                    <ul className="flex flex-col">
                      {chapter.lessons.map(lesson => (
                        <li
                          key={lesson.id}
                          className="flex items-center gap-2 border-t border-[var(--biolink-border)] py-2 text-sm"
                        >
                          <GraduationCapIcon
                            className="size-4 shrink-0 text-[var(--biolink-muted-text)]"
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1 truncate text-[var(--biolink-text)]">
                            {lesson.title}
                          </span>
                          {(lesson.duration_seconds ?? 0) > 0 && (
                            <span className="shrink-0 text-xs text-[var(--biolink-muted-text)] tabular-nums">
                              <DurationLabel
                                totalSeconds={lesson.duration_seconds!}
                              />
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="border-t border-[var(--biolink-border)] py-3 text-sm text-[var(--biolink-muted-text)]">
                      <Trans message="No published lessons yet." />
                    </p>
                  )}
                </Accordion.Content>
              </Accordion.Item>
            );
          })}
        </Accordion.Root>
      </Card.Content>
    </Card.Root>
  );
}

function CurriculumStateCard({children}: {children: ReactNode}) {
  return (
    <Card.Root className={biolinkSurfaceCard}>
      <Card.Content className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
        <h2 className={biolinkSectionTitle}>
          <Trans message="Course curriculum" />
        </h2>
        {children}
      </Card.Content>
    </Card.Root>
  );
}

function isPaid(order: DigitalProductOrder) {
  return order.status === 'paid' || order.payment_status === 'paid';
}

function shortReference(reference: string) {
  return reference.length > 16 ? `#${reference.slice(0, 8)}` : `#${reference}`;
}

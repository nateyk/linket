import {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {
  resolveBiolinkButtonAppearance,
  resolveBiolinkThemeVariables,
} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {ProductGallery} from '@app/digital-products/public/product-page/product-gallery';
import {ProductCreatorCard} from '@app/digital-products/public/product-page/product-creator-card';
import {ProductOverview} from '@app/digital-products/public/product-page/product-overview';
import {ProductPricingCard} from '@app/digital-products/public/product-page/product-pricing-card';
import {ProductSummary} from '@app/digital-products/public/product-page/product-summary';
import {
  ProductTabs,
  type ProductTabSection,
} from '@app/digital-products/public/product-page/product-tabs';
import {
  biolinkSectionTitle,
  biolinkSurfaceCard,
} from '@app/digital-products/public/product-page/surface';
import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Spinner} from '@shadcn/spinner/spinner';
import {
  getImageBackgroundEffectStyle,
  ImageBackgroundEffectOverlay,
} from '@common/background-selector/image-background-effect';
import {NoiseFilter} from '@common/background-selector/images/noise-filter';
import {
  cssPropsFromBgConfig,
  getBgTintStyle,
} from '@common/background-selector/utils/css-props-from-bg-config';
import {apiClient} from '@common/http/query-client';
import {loadFonts} from '@ui/fonts/font-picker/load-fonts';
import {formatMoney as formatPrice} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {
  ArrowLeftIcon,
  CheckCircle2Icon,
  DownloadIcon,
  FileDownIcon,
  FileIcon,
  GraduationCapIcon,
  LockKeyholeIcon,
  RefreshCwIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
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
  currency: string;
  type?: string;
  is_course?: boolean;
  course_id?: number | null;
  lessons_count?: number | null;
  chapters_count?: number | null;
  cover?: {url: string} | null;
  files_count?: number;
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
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerError, setBuyerError] = useState<'name' | 'email'>();
  const [checkoutFailed, setCheckoutFailed] = useState(false);
  const [reviewsSummary, setReviewsSummary] = useState<ProductReviewsSummary>();
  const checkoutCancelled =
    new URLSearchParams(window.location.search).get('checkout') === 'cancelled';

  const beginCheckout = async () => {
    if (buyerName.trim().length < 2) {
      setBuyerError('name');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(buyerEmail.trim())) {
      setBuyerError('email');
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
        },
      );
      const payload = response.data;
      const checkoutUrl = payload?.checkout_url ?? payload?.data?.checkout_url;

      if (typeof checkoutUrl !== 'string') {
        throw new Error('Checkout could not be started.');
      }

      window.location.assign(checkoutUrl);
    } catch {
      setCheckoutFailed(true);
      setSubmitting(false);
    }
  };

  const reviewsEnabled = data.reviews_enabled !== false;
  const tabSections: ProductTabSection[] = [];

  if (
    data.product.description ||
    (data.product.learning_outcomes?.length ?? 0) > 0
  ) {
    tabSections.push({
      value: 'overview',
      label: <Trans message="Overview" />,
      content: <ProductOverview product={data.product} />,
    });
  }

  if (data.product.is_course && data.product.course_id) {
    tabSections.push({
      value: 'curriculum',
      label: <Trans message="Curriculum" />,
      content: <CourseCurriculum courseId={data.product.course_id} />,
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
      <div className="flex w-full max-w-6xl flex-col gap-4 sm:gap-5">
        <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-6">
          <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-1">
            <Card.Root className={biolinkSurfaceCard}>
              <ProductGallery product={data.product} />
              <Card.Content className="flex min-w-0 flex-col gap-6 p-5 sm:p-7">
                <ProductSummary
                  product={data.product}
                  creator={data.creator}
                  biolink={data.biolink}
                  reviews={reviewsSummary}
                />
              </Card.Content>
            </Card.Root>
          </div>

          <aside className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:sticky lg:top-6">
            <ProductPricingCard
              product={data.product}
              appearance={data.appearance}
              checkoutCancelled={checkoutCancelled}
              checkoutFailed={checkoutFailed}
              submitting={submitting}
              onBuy={() => setBuyerDialogOpen(true)}
            />
          </aside>

          <div className="flex min-w-0 flex-col gap-5 lg:col-start-1 lg:row-start-2">
            <ProductTabs sections={tabSections} />
          </div>
        </div>
      </div>
      <BuyerDetailsDialog
        appearance={data.appearance}
        open={buyerDialogOpen}
        submitting={submitting}
        name={buyerName}
        email={buyerEmail}
        phone={buyerPhone}
        error={buyerError}
        onOpenChange={setBuyerDialogOpen}
        onNameChange={setBuyerName}
        onEmailChange={setBuyerEmail}
        onPhoneChange={setBuyerPhone}
        onSubmit={() => void beginCheckout()}
      />
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
      backLabel={<Trans message="Return to bio" />}
    >
      <Card.Root className="w-full max-w-xl gap-0 overflow-hidden bg-[var(--biolink-surface-strong)] py-0 text-[var(--biolink-text)] ring-1 ring-[var(--biolink-border)] backdrop-blur-xl">
        <div
          className={cn(
            'border-b px-5 py-5 sm:px-6',
            paid ? 'bg-positive/8' : 'bg-primary/6',
          )}
        >
          {paid ? (
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-positive/10 text-positive">
                <CheckCircle2Icon className="size-5" />
              </span>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  <Trans message="Your download is ready" />
                </h1>
                <p className="mt-1 text-sm text-[var(--biolink-muted-text)]">
                  <Trans
                    message="Thanks for your purchase of :product."
                    values={{product: data.product.title}}
                  />
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <Spinner className="size-5" />
              </span>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">
                  <Trans message="Finalizing your payment" />
                </h1>
                <p className="mt-1 text-sm text-[var(--biolink-muted-text)]">
                  <Trans message="This usually takes just a few seconds. Keep this page open." />
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          {order.buyer_email && (
            <p className="text-sm text-[var(--biolink-muted-text)]">
              <Trans
                message="Your receipt is being sent to :email."
                values={{email: order.buyer_email}}
              />
            </p>
          )}

          {paid ? (
            <>
              <OrderSummary order={order} product={data.product} />
              <DownloadList
                appearance={data.appearance}
                downloads={order.downloads ?? []}
              />
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
  open,
  submitting,
  name,
  email,
  phone,
  error,
  onOpenChange,
  onNameChange,
  onEmailChange,
  onPhoneChange,
  onSubmit,
}: {
  appearance?: BiolinkAppearanceConfig | null;
  open: boolean;
  submitting: boolean;
  name: string;
  email: string;
  phone: string;
  error?: 'name' | 'email';
  onOpenChange: (open: boolean) => void;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onSubmit: () => void;
}) {
  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);
  const themeVariables = resolveBiolinkThemeVariables(appearance);

  return (
    <Dialog.Root
      open={open}
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
          style={{
            ...themeVariables,
            fontFamily: appearance?.fontConfig?.family,
          }}
        >
          <Dialog.Header>
            <Dialog.Title>
              <LockKeyholeIcon />
              <Trans message="Continue to secure payment" />
            </Dialog.Title>
            <Dialog.Description className="text-[var(--biolink-muted-text)]">
              <Trans message="We use your email to send your receipt and protected download links." />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            <form
              id="digital-product-buyer-details"
              className="space-y-4 px-0.5 py-1"
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
                  <Trans message="Only shared with Chapa to support this payment." />
                </Field.Description>
              </Field.Root>
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
              disabled={submitting}
            >
              {submitting ? <Spinner /> : <LockKeyholeIcon />}
              <Trans
                message={
                  submitting
                    ? 'Opening secure checkout...'
                    : 'Continue to payment'
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
}: {
  order: DigitalProductOrder;
  product: PublicDigitalProduct;
}) {
  const total =
    typeof order.gross_amount_cents === 'number'
      ? formatPrice(
          order.gross_amount_cents,
          order.currency ?? product.currency,
        )
      : formatPrice(product.price_cents, product.currency);

  return (
    <section
      className="divide-y divide-[var(--biolink-border)] rounded-card border border-[var(--biolink-border)]"
      aria-label="Order summary"
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
          <Trans message="Total paid" />
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
          <span>{formatDate(order.paid_at)}</span>
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
  backLabel: React.ReactNode;
  wide?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!appearance?.fontConfig) return;
    loadFonts([appearance.fontConfig], {id: 'digital-product-fonts'});
  }, [appearance?.fontConfig]);

  return (
    <div
      className="relative isolate min-h-screen px-4 py-5 text-[var(--biolink-text)] sm:px-6 sm:py-10"
      style={{
        ...resolveBiolinkThemeVariables(appearance),
        fontFamily: appearance?.fontConfig?.family,
      }}
    >
      <ProductBackground appearance={appearance ?? null} />
      <main
        className={cn(
          'relative mx-auto flex w-full flex-col gap-4',
          wide ? 'max-w-5xl' : 'max-w-xl',
        )}
      >
        <BackToBio backUrl={backUrl}>{backLabel}</BackToBio>
        {children}
      </main>
    </div>
  );
}

function BackToBio({
  backUrl,
  children,
}: {
  backUrl?: string | null;
  children: React.ReactNode;
}) {
  const className =
    'inline-flex h-9 w-fit items-center gap-2 self-start rounded-button bg-[var(--biolink-surface-strong)] px-3 text-sm font-medium text-[var(--biolink-text)] shadow-xs ring-1 ring-[var(--biolink-border)] backdrop-blur-sm transition-colors hover:bg-[var(--biolink-surface)] focus-visible:outline-2 focus-visible:outline-offset-4';

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
      <Alert variant="warning" fillStyle="subtleFill">
        <FileIcon />
        <Alert.Title>
          <Trans message="Your files are being prepared" />
        </Alert.Title>
        <Alert.Description>
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
      <div className="divide-y divide-[var(--biolink-border)] rounded-card border border-[var(--biolink-border)]">
        {downloads.map(download => (
          <div
            key={download.id}
            className="flex items-center gap-3 px-4 py-3 first:rounded-t-card last:rounded-b-card"
          >
            <FileDownIcon className="size-4 shrink-0 text-[var(--biolink-muted-text)]" />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {download.name}
            </span>
            {typeof download.remaining_downloads === 'number' && (
              <span className="hidden text-xs text-[var(--biolink-muted-text)] sm:inline">
                <Trans
                  message=":count left"
                  values={{count: download.remaining_downloads}}
                />
              </span>
            )}
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

function CourseCurriculum({courseId}: {courseId: number}) {
  const [curriculum, setCurriculum] = useState<null | {chapters: {id: number; title: string; lessons: {id: number; title: string}[]}[]}>(null);
  useEffect(() => {
    void (async () => {
      try {
        const {data: payload} = await apiClient.get(
          `/api/v1/public/courses/${courseId}/curriculum`,
        );
        setCurriculum(payload.data ?? payload);
      } catch {
        // Leave the optional curriculum section hidden when it cannot load.
      }
    })();
  }, [courseId]);
  if (!curriculum?.chapters?.length) return null;

  return (
    <Card.Root className={biolinkSurfaceCard}>
      <Card.Content className="flex min-w-0 flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className={biolinkSectionTitle}>
            <Trans message="Course curriculum" />
          </h2>
          <span className="text-xs font-medium text-[var(--biolink-muted-text)]">
            <Trans
              message="[one :count chapter|other :count chapters]"
              values={{count: curriculum.chapters.length}}
            />
          </span>
        </div>

        <ol className="flex flex-col gap-2">
          {curriculum.chapters.map((chapter, index) => (
            <li
              key={chapter.id}
              className="flex flex-col gap-2 rounded-card border border-[var(--biolink-border)] bg-[var(--biolink-surface)] p-3"
            >
              <div className="flex items-center gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-card-xs bg-[var(--biolink-surface-strong)] text-xs font-semibold tabular-nums text-[var(--biolink-text)] ring-1 ring-[var(--biolink-border)]">
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <h3 className="truncate text-sm font-medium">
                    {chapter.title}
                  </h3>
                  <p className="text-xs text-[var(--biolink-muted-text)]">
                    <Trans
                      message="[one :count lesson|other :count lessons]"
                      values={{count: chapter.lessons.length}}
                    />
                  </p>
                </div>
              </div>
              {chapter.lessons.length > 0 && (
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
                      <span className="min-w-0 flex-1 truncate">
                        {lesson.title}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>
      </Card.Content>
    </Card.Root>
  );
}

function ProductBackground({
  appearance,
}: {
  appearance: BiolinkAppearanceConfig | null;
}) {
  const tintStyle = getBgTintStyle(appearance?.bgConfig?.tint);
  const effectStyle = getImageBackgroundEffectStyle(
    appearance?.bgConfig?.imageEffect,
    appearance?.bgConfig?.noise,
  );

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{...cssPropsFromBgConfig(appearance?.bgConfig), ...effectStyle}}
      />
      <ImageBackgroundEffectOverlay
        effect={appearance?.bgConfig?.imageEffect}
      />
      {tintStyle && <div className="absolute inset-0" style={tintStyle} />}
      {appearance?.bgConfig?.noise && <NoiseFilter />}
    </div>
  );
}

function isPaid(order: DigitalProductOrder) {
  return order.status === 'paid' || order.payment_status === 'paid';
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function shortReference(reference: string) {
  return reference.length > 16 ? `#${reference.slice(0, 8)}` : `#${reference}`;
}

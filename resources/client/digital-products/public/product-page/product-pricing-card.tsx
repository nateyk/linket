import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Separator} from '@shadcn/separator';
import type {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {resolveBiolinkButtonAppearance} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {formatMoney as formatPrice} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {
  BookOpenIcon,
  GraduationCapIcon,
  LockKeyholeIcon,
  ReceiptIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  TimerIcon,
  type LucideIcon,
} from 'lucide-react';
import type {PublicDigitalProduct} from '../digital-product-public-pages';
import type {ProductReviewsSummary} from '../product-reviews-block';
import {RatingStars} from '../product-rating-stars';
import {productTypeIcon} from './product-type';
import {biolinkSurfaceCard, biolinkSurfaceContent} from './surface';

export function ProductPricingCard({
  product,
  reviews,
  appearance,
  checkoutCancelled,
  checkoutFailed,
  submitting,
  onBuy,
}: {
  product: PublicDigitalProduct;
  reviews?: ProductReviewsSummary;
  appearance?: BiolinkAppearanceConfig | null;
  checkoutCancelled: boolean;
  checkoutFailed: boolean;
  submitting: boolean;
  onBuy: () => void;
}) {
  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);
  const TypeIcon = productTypeIcon(product.type);
  const isCourse = !!product.is_course;
  const average = reviews?.average;
  const reviewCount = reviews?.rating_stats?.total ?? 0;
  const showRating = typeof average === 'number' && reviewCount > 0;

  return (
    <Card.Root className={biolinkSurfaceCard}>
      <Card.Content className={biolinkSurfaceContent}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="text-xs font-medium tracking-wide text-[var(--biolink-muted-text)] uppercase">
              <Trans message="One-time purchase" />
            </span>
            <p className="text-4xl leading-none font-semibold tracking-tight">
              {formatPrice(product.price_cents, product.currency)}
            </p>
            {showRating && (
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-sm">
                <RatingStars value={Math.round(average)} />
                <span className="font-medium text-[var(--biolink-text)] tabular-nums">
                  {average.toFixed(1)}
                </span>
                <span className="text-[var(--biolink-muted-text)]">
                  (
                  <Trans
                    message=":count reviews"
                    values={{count: reviewCount}}
                  />
                  )
                </span>
              </div>
            )}
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-card-sm bg-[var(--biolink-surface)] text-[var(--biolink-muted-text)] ring-1 ring-[var(--biolink-border)]">
            <TypeIcon className="size-5" aria-hidden="true" />
          </span>
        </div>

        {checkoutCancelled && (
          <Alert
            variant="warning"
            fillStyle="subtleFill"
            className="border-[var(--biolink-border,var(--color-border))]!"
          >
            <RefreshCwIcon className="text-[var(--biolink-muted-text,var(--color-muted-foreground))]!" />
            <Alert.Title>
              <Trans message="Checkout cancelled" />
            </Alert.Title>
            <Alert.Description className="text-[var(--biolink-muted-text,var(--color-muted-foreground))]!">
              <Trans message="Your product is still available when you are ready." />
            </Alert.Description>
          </Alert>
        )}
        {checkoutFailed && (
          <Alert
            variant="destructive"
            fillStyle="subtleFill"
            className="border-[var(--biolink-border,var(--color-border))]!"
          >
            <RefreshCwIcon className="text-[var(--biolink-muted-text,var(--color-muted-foreground))]!" />
            <Alert.Title>
              <Trans message="Unable to start checkout" />
            </Alert.Title>
            <Alert.Description className="text-[var(--biolink-muted-text,var(--color-muted-foreground))]!">
              <Trans message="Please try again in a moment." />
            </Alert.Description>
          </Alert>
        )}

        <Button
          variant="ghost"
          className={cn('w-full', buttonAppearance.className)}
          style={buttonAppearance.style}
          size="lg"
          disabled={submitting}
          onClick={onBuy}
        >
          <LockKeyholeIcon />
          <Trans message="Buy now" />
        </Button>

        <Separator className="bg-[var(--biolink-border)]" />

        <ul className="flex flex-col gap-3 text-sm text-[var(--biolink-muted-text)]">
          {isCourse ? (
            <>
              {typeof product.lessons_count === 'number' && (
                <IncludesItem icon={GraduationCapIcon}>
                  <Trans
                    message="[one :count lesson|other :count lessons]"
                    values={{count: product.lessons_count}}
                  />
                </IncludesItem>
              )}
              {typeof product.chapters_count === 'number' && (
                <IncludesItem icon={BookOpenIcon}>
                  <Trans
                    message="[one :count chapter|other :count chapters]"
                    values={{count: product.chapters_count}}
                  />
                </IncludesItem>
              )}
            </>
          ) : (
            typeof product.files_count === 'number' && (
              <IncludesItem icon={productTypeIcon(product.type)}>
                <Trans
                  message="[one :count file included|other :count files included]"
                  values={{count: product.files_count}}
                />
              </IncludesItem>
            )
          )}
          <IncludesItem icon={ShoppingBagIcon}>
            <Trans message="Access your purchase anytime from My Orders" />
          </IncludesItem>
          <IncludesItem icon={TimerIcon}>
            <Trans message="One-time payment, no subscription" />
          </IncludesItem>
          <IncludesItem icon={ReceiptIcon}>
            <Trans message="We email your receipt and protected download links as soon as payment is confirmed." />
          </IncludesItem>
        </ul>

        <div className="flex items-start gap-2 rounded-card bg-[var(--biolink-surface)] p-3 text-sm text-[var(--biolink-muted-text)]">
          <ShieldCheckIcon
            className="mt-0.5 size-4 shrink-0 text-positive"
            aria-hidden="true"
          />
          <Trans message="Secure payment with protected access after confirmation." />
        </div>
      </Card.Content>
    </Card.Root>
  );
}

function IncludesItem({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="grid size-7 shrink-0 place-items-center rounded-card-xs bg-[var(--biolink-surface)] text-[var(--biolink-muted-text)] ring-1 ring-[var(--biolink-border)]">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 pt-1 leading-5">{children}</span>
    </li>
  );
}

import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Separator} from '@shadcn/separator';
import type {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {resolveBiolinkButtonAppearance} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {formatMoney as formatPrice} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import type {Ref} from 'react';
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
import {productTypeIcon} from './product-type';
import {biolinkSurfaceCard, biolinkSurfaceContent} from './surface';

export function ProductPricingCard({
  product,
  appearance,
  checkoutCancelled,
  checkoutFailed,
  submitting,
  onBuy,
  actionRef,
}: {
  product: PublicDigitalProduct;
  appearance?: BiolinkAppearanceConfig | null;
  checkoutCancelled: boolean;
  checkoutFailed: boolean;
  submitting: boolean;
  onBuy: () => void;
  actionRef?: Ref<HTMLDivElement>;
}) {
  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);
  const TypeIcon = productTypeIcon(product.type);
  const isCourse = !!product.is_course;

  return (
    <Card.Root className={biolinkSurfaceCard}>
      <Card.Content className={biolinkSurfaceContent}>
        <div className="flex items-start justify-between gap-4">
          <p className="text-4xl leading-none font-semibold tracking-tight tabular-nums">
            {formatPrice(product.price_cents, product.currency)}
          </p>
          <span className="grid size-10 shrink-0 place-items-center rounded-card-sm bg-[var(--biolink-surface)] text-[var(--biolink-muted-text)] ring-1 ring-(color:--biolink-border)">
            <TypeIcon className="size-5" aria-hidden="true" />
          </span>
        </div>

        {/* The Buy action stays pinned directly under the price so a
            cancelled/failed return never pushes the only recovery CTA below
            the fold — the alerts below it carry their own Try again. */}
        <div ref={actionRef}>
          <Button
            variant="ghost"
            className={cn('w-full', buttonAppearance.className)}
            style={buttonAppearance.style}
            size="lg"
            disabled={submitting || product.can_buy === false}
            onClick={onBuy}
          >
            <LockKeyholeIcon />
            {product.verification_quota_exhausted ? <Trans message="Creator cannot accept additional verified sales right now" /> : <Trans message={product.can_buy === false ? 'Temporarily unavailable' : 'Buy now'} />}
          </Button>
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
            <Button
              variant="ghost"
              size="sm"
              className={cn('mt-3 w-fit', buttonAppearance.className)}
              style={buttonAppearance.style}
              disabled={submitting}
              onClick={onBuy}
            >
              <RefreshCwIcon />
              <Trans message="Try again" />
            </Button>
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
            <Button
              variant="ghost"
              size="sm"
              className={cn('mt-3 w-fit', buttonAppearance.className)}
              style={buttonAppearance.style}
              disabled={submitting}
              onClick={onBuy}
            >
              <RefreshCwIcon />
              <Trans message="Try again" />
            </Button>
          </Alert>
        )}

        <Separator className="bg-[var(--biolink-border)]" />

        <ul className="flex flex-col gap-3 text-base text-[var(--biolink-muted-text)]">
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
            <Trans message="Access anytime from My Portal" />
          </IncludesItem>
          <IncludesItem icon={TimerIcon}>
            <Trans message="One-time payment, no subscription" />
          </IncludesItem>
          <IncludesItem icon={ReceiptIcon}>
            <Trans message="Receipt and download links by email" />
          </IncludesItem>
        </ul>

        <div className="flex items-start gap-2 rounded-card bg-[var(--biolink-surface)] p-3 text-base text-[var(--biolink-muted-text)]">
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
      <span className="grid size-7 shrink-0 place-items-center rounded-card-xs bg-[var(--biolink-surface)] text-[var(--biolink-muted-text)] ring-1 ring-(color:--biolink-border)">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 pt-1 leading-5">{children}</span>
    </li>
  );
}

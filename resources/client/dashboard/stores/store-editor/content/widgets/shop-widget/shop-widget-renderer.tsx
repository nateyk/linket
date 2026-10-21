import {ShopWidgetConfig} from '@app/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-dialog';
import {WidgetRendererProps} from '@app/dashboard/stores/store-editor/content/widgets/widget-renderer-props';
import {ProductCard} from '@app/digital-products/shared/product-card';
import {
  biolinkSurfaceEdgeClassName,
  resolveBiolinkButtonAppearance,
} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {apiClient} from '@common/http/query-client';
import {Button} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Trans} from '@ui/i18n/trans';
import {message} from '@ui/i18n/message';
import {useTrans} from '@ui/i18n/use-trans';
import {formatMoney} from '@ui/i18n/format-money';
import {cn} from '@ui/utils/cn';
import {PackageIcon} from 'lucide-react';
import {useEffect, useState} from 'react';
import type {ReactNode} from 'react';

type Product = {
  id: number;
  title: string;
  price_cents: number;
  currency: string;
  cover?: {url: string} | null;
};

type ShopLoadState = 'loading' | 'ready' | 'error';

/**
 * Prefer 2-up; allow 3 only when the content column is wide enough.
 *
 * `auto-fill` keeps empty tracks, so a lone product stays ~½–⅓ width (a card)
 * instead of stretching full-bleed. `minmax(18rem, 1fr)` needs ~900px+ before
 * a third column fits — matching the sidebar + content storefront chrome.
 * `min(100%, …)` collapses to one column on narrow phones.
 */
const shopGridClassName =
  'grid w-full grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4 overflow-visible sm:gap-5';

export function ShopWidgetRenderer({
  widget,
  variant,
  biolink,
  appearance,
  titleOverride,
  showHeading = true,
}: WidgetRendererProps & {
  titleOverride?: ReactNode;
  showHeading?: boolean;
}) {
  const config = widget.config as ShopWidgetConfig;
  const productIds = Array.isArray(config.product_ids)
    ? config.product_ids
    : [];
  const productIdsKey = productIds.join(',');
  const storeId = biolink?.id;
  const [products, setProducts] = useState<Product[]>([]);
  const [loadState, setLoadState] = useState<ShopLoadState>('loading');
  const {trans} = useTrans();

  useEffect(() => {
    if (variant !== 'biolinkPage' || !storeId) {
      return;
    }

    let cancelled = false;
    setLoadState('loading');
    apiClient
      .get(`/api/v1/public/stores/${storeId}/digital-products`)
      .then(response => response.data)
      .then(payload => {
        if (!cancelled) {
          const payloadProducts = payload.data ?? [];
          if (!productIdsKey) {
            setProducts(payloadProducts);
            setLoadState('ready');
            return;
          }

          const visibleIds = new Set(
            productIdsKey
              .split(',')
              .filter(Boolean)
              .map(id => Number(id)),
          );

          setProducts(
            payloadProducts.filter((product: Product) =>
              visibleIds.has(product.id),
            ),
          );
          setLoadState('ready');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([]);
          setLoadState('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [variant, storeId, productIdsKey]);

  if (variant === 'editor') {
    return (
      <div className="text-sm text-muted-foreground">
        <Trans message="Items section" />
      </div>
    );
  }

  if (!biolink) {
    return null;
  }

  const buttonAppearance = resolveBiolinkButtonAppearance(
    appearance ?? biolink.appearance?.config ?? null,
  );
  // Same Appearance → Shadow soft-pop as the creator card, so product and
  // profile surfaces share one edge language (ring + optional shadow).
  const buttonShadow = buttonAppearance.style.boxShadow;

  const productsHeadingId = 'storefront-products-heading';
  const heading = showHeading ? (
    <div className="mb-4 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h2
          id={productsHeadingId}
          className="truncate text-xl leading-tight font-semibold tracking-tight sm:text-2xl"
        >
          {titleOverride || config.title || <Trans message="Items" />}
        </h2>
        {loadState === 'ready' && products.length > 0 && (
          <p className="text-sm text-[var(--biolink-muted-text)]">
            {products.length === 1 ? (
              <Trans
                message=":count item for sale"
                values={{count: products.length}}
              />
            ) : (
              <Trans
                message=":count items for sale"
                values={{count: products.length}}
              />
            )}
          </p>
        )}
      </div>
    </div>
  ) : null;

  const sectionLabelProps = showHeading
    ? {'aria-labelledby': productsHeadingId}
    : {'aria-label': trans(message('Products'))};

  const emptySurfaceClassName = cn(
    'bg-[var(--biolink-surface)] py-10 text-[var(--biolink-text)]',
    biolinkSurfaceEdgeClassName,
  );

  if (loadState === 'loading') {
    return (
      <section
        className="w-full min-w-0 overflow-visible"
        aria-busy="true"
        {...sectionLabelProps}
      >
        {heading}
        <div className={shopGridClassName}>
          {[0, 1, 2].map(key => (
            <Skeleton
              key={key}
              className="aspect-video w-full rounded-card bg-[var(--biolink-surface-muted)]"
            />
          ))}
        </div>
      </section>
    );
  }

  if (loadState === 'error') {
    return (
      <section
        className="w-full min-w-0 overflow-visible"
        {...sectionLabelProps}
      >
        {heading}
        <Empty.Root className={emptySurfaceClassName}>
          <Empty.Header>
            <Empty.Media
              variant="icon"
              className="bg-[var(--biolink-surface-muted)] text-[var(--biolink-text)]"
            >
              <PackageIcon />
            </Empty.Media>
            <Empty.Title>
              <Trans message="Couldn't load products" />
            </Empty.Title>
            <Empty.Description className="text-[var(--biolink-muted-text)]">
              <Trans message="Refresh the page and try again." />
            </Empty.Description>
          </Empty.Header>
        </Empty.Root>
      </section>
    );
  }

  if (!products.length) {
    return (
      <section
        className="w-full min-w-0 overflow-visible"
        {...sectionLabelProps}
      >
        {heading}
        <Empty.Root className={emptySurfaceClassName}>
          <Empty.Header>
            <Empty.Media
              variant="icon"
              className="bg-[var(--biolink-surface-muted)] text-[var(--biolink-text)]"
            >
              <PackageIcon />
            </Empty.Media>
            <Empty.Title>
              <Trans message="Nothing for sale yet" />
            </Empty.Title>
            <Empty.Description className="text-[var(--biolink-muted-text)]">
              <Trans message="Check back soon, or open the profile for more about this creator." />
            </Empty.Description>
          </Empty.Header>
        </Empty.Root>
      </section>
    );
  }

  return (
    <section
      className="w-full min-w-0 overflow-visible"
      {...sectionLabelProps}
    >
      {heading}
      <div className={shopGridClassName}>
        {products.map(product => {
          const href = `${biolink.short_url}/products/${product.id}`;
          return (
            <ProductCard
              key={product.id}
              quiet
              images={product.cover?.url ? [product.cover.url] : []}
              title={product.title}
              // One CTA only: Appearance-styled View. Title stays text so we
              // do not stack a second link to the same URL.
              price={formatMoney(product.price_cents, product.currency)}
              style={{boxShadow: buttonShadow}}
              action={
                <Button
                  size="sm"
                  // ghost drops dashboard primary fill so Appearance tokens
                  // paint cleanly (same pattern as Message / socials).
                  variant="ghost"
                  className={cn(
                    buttonAppearance.className,
                    'min-h-9 pointer-coarse:min-h-11',
                  )}
                  style={buttonAppearance.style}
                  aria-label={trans(
                    message('View :title', {
                      values: {title: product.title},
                    }),
                  )}
                  render={<a href={href} />}
                >
                  <Trans message="View" />
                </Button>
              }
              imageFallback={
                <div className="flex h-full w-full items-center justify-center bg-[var(--biolink-surface-muted)] text-[var(--biolink-muted-text)]">
                  <PackageIcon className="size-8 opacity-65" />
                </div>
              }
              classNames={{
                root: cn(
                  'bg-[var(--biolink-surface)] text-[var(--biolink-text)]',
                  biolinkSurfaceEdgeClassName,
                ),
                // Keep ProductCard's default aspect-video — portrait 4/5
                // stretched landscape covers into a tall distorted frame.
                media: 'bg-[var(--biolink-surface-muted)]',
                body: 'gap-3 p-4',
                title:
                  'line-clamp-2 text-base leading-snug font-semibold text-[var(--biolink-text)] sm:text-lg',
                price:
                  'text-base tracking-tight text-[var(--biolink-text)] tabular-nums sm:text-lg',
                footer: 'gap-3 pt-1',
              }}
            />
          );
        })}
      </div>
    </section>
  );
}

import {ShopWidgetConfig} from '@app/dashboard/biolink/biolink-editor/content/widgets/shop-widget/shop-widget-dialog';
import {WidgetRendererProps} from '@app/dashboard/biolink/biolink-editor/content/widgets/widget-renderer-props';
import {Trans} from '@ui/i18n/trans';
import {useEffect, useState} from 'react';
import {ArrowUpRightIcon, ShoppingBagIcon} from 'lucide-react';
import type {ReactNode} from 'react';

type Product = {
  id: number;
  title: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  cover?: {url: string} | null;
};

export function ShopWidgetRenderer({
  widget,
  variant,
  biolink,
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
  const biolinkId = biolink?.id;
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (variant !== 'biolinkPage' || !biolinkId) {
      return;
    }

    let cancelled = false;
    fetch(`/api/v1/public/biolinks/${biolinkId}/digital-products`, {
      headers: {Accept: 'application/json'},
    })
      .then(response => (response.ok ? response.json() : {data: []}))
      .then(payload => {
        if (!cancelled) {
          const payloadProducts = payload.data ?? [];
          if (!productIdsKey) {
            setProducts(payloadProducts);
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
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProducts([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [variant, biolinkId, productIdsKey]);

  if (variant === 'editor') {
    return (
      <div className="text-sm text-muted-foreground">
        <Trans message="Digital Products section" />
      </div>
    );
  }
  if (!products.length || !biolink) return null;

  return (
    <section className="w-full min-w-0">
      {showHeading && (
        <div className="mb-3 flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-2xl leading-tight font-semibold">
              {titleOverride || config.title || (
                <Trans message="Digital Products" />
              )}
            </h2>
            <p className="text-sm text-[var(--biolink-muted-text)]">
              {products.length === 1 ? (
                <Trans
                  message=":count published item"
                  values={{count: products.length}}
                />
              ) : (
                <Trans
                  message=":count published items"
                  values={{count: products.length}}
                />
              )}
            </p>
          </div>
        </div>
      )}
      <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 @4xl:grid-cols-3">
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            href={`${biolink.short_url}/products/${product.id}`}
          />
        ))}
      </div>
    </section>
  );
}

function ProductCard({product, href}: {product: Product; href: string}) {
  return (
    <a
      className="group flex h-full min-w-0 flex-col overflow-hidden rounded-card bg-[var(--biolink-surface)] text-[var(--biolink-text)] no-underline shadow-sm ring-1 ring-[var(--biolink-border)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--biolink-text)]"
      href={href}
    >
      <div className="aspect-video w-full overflow-hidden bg-[var(--biolink-surface-muted)]">
        {product.cover?.url ? (
          <img
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            src={product.cover.url}
            alt={product.title}
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="grid size-11 place-items-center rounded-card-sm bg-[var(--biolink-surface-strong)] ring-1 ring-[var(--biolink-border)]">
              <ShoppingBagIcon className="size-5 text-[var(--biolink-muted-text)] opacity-65" />
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-3">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="line-clamp-2 text-sm leading-snug font-semibold">
            {product.title}
          </div>
          <div className="text-sm leading-none font-semibold">
            {formatMoney(product.price_cents, product.currency)}
          </div>
        </div>
        <div className="mt-auto flex items-center justify-between border-t border-[var(--biolink-border)] pt-2 text-xs font-medium text-[var(--biolink-muted-text)]">
          <span>
            <Trans message="View product" />
          </span>
          <span className="inline-flex size-7 items-center justify-center rounded-card-xs bg-[var(--biolink-surface-muted)] text-[var(--biolink-muted-text)] transition-colors group-hover:bg-[var(--biolink-surface-strong)] group-hover:text-[var(--biolink-text)]">
            <ArrowUpRightIcon className="size-3.5" />
          </span>
        </div>
      </div>
    </a>
  );
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {style: 'currency', currency}).format(
    cents / 100,
  );
}

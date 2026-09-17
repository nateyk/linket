import {ShopWidgetConfig} from '@app/dashboard/stores/store-editor/content/widgets/shop-widget/shop-widget-dialog';
import {WidgetRendererProps} from '@app/dashboard/stores/store-editor/content/widgets/widget-renderer-props';
import {ProductCard} from '@app/digital-products/shared/product-card';
import {apiClient} from '@common/http/query-client';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {formatMoney} from '@ui/i18n/format-money';
import {useEffect, useState} from 'react';
import {ArrowRightIcon} from 'lucide-react';
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
  const storeId = biolink?.id;
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (variant !== 'biolinkPage' || !storeId) {
      return;
    }

    let cancelled = false;
    apiClient
      .get(`/api/v1/public/stores/${storeId}/digital-products`)
      .then(response => response.data)
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
  }, [variant, storeId, productIdsKey]);

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
        {products.map(product => {
          const href = `${biolink.short_url}/products/${product.id}`;
          return (
            <ProductCard
              key={product.id}
              images={product.cover?.url ? [product.cover.url] : []}
              title={product.title}
              titleHref={href}
              price={formatMoney(product.price_cents, product.currency)}
              action={
                <Button
                  size="sm"
                  render={<a href={href} />}
                >
                  <Trans message="View product" />
                  <ArrowRightIcon data-icon="inline-end" />
                </Button>
              }
              classNames={{
                root: 'bg-[var(--biolink-surface)] text-[var(--biolink-text)] ring-[var(--biolink-border)] backdrop-blur-md',
                media: 'bg-[var(--biolink-surface-muted)]',
                footer:
                  'border-t border-[var(--biolink-border)] pt-2',
              }}
            />
          );
        })}
      </div>
    </section>
  );
}

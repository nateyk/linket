import {ShopWidget} from '@app/dashboard/biolink/biolink-editor/content/widgets/shop-widget/shop-widget-dialog';
import {WidgetRendererProps} from '@app/dashboard/biolink/biolink-editor/content/widgets/widget-renderer-props';
import {Trans} from '@ui/i18n/trans';
import {useEffect, useState} from 'react';

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
}: WidgetRendererProps<ShopWidget>) {
  const ids = Array.isArray(widget.config.product_ids) ? widget.config.product_ids : [];
  const [products, setProducts] = useState<Product[]>([]);
  useEffect(() => {
    if (variant !== 'biolinkPage' || !biolink || !ids.length) {
      return;
    }

    let cancelled = false;
    fetch(`/api/v1/public/biolinks/${biolink.id}/digital-products`, {
      headers: {Accept: 'application/json'},
    })
      .then(response => (response.ok ? response.json() : {data: []}))
      .then(payload => {
        if (!cancelled) {
          const visibleIds = new Set(ids);
          setProducts((payload.data ?? []).filter((product: Product) => visibleIds.has(product.id)));
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
  }, [variant, biolink?.id, ids.join(',')]);

  if (variant === 'editor') return <div className="text-sm text-muted-foreground"><Trans message="Shop: :count products" values={{count: ids.length}} /></div>;
  if (!products.length || !biolink) return null;

  return (
    <section className="mt-6 text-left">
      <h2 className="mb-3 text-base font-semibold">
        {widget.config.title || <Trans message="Shop" />}
      </h2>
      <div className={widget.config.layout === 'grid' ? 'grid gap-3 sm:grid-cols-2' : 'grid gap-3'}>
        {products.map(product => (
          <a
            key={product.id}
            className="block overflow-hidden rounded-lg bg-background/90 text-foreground no-underline shadow-sm transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring"
            href={`${biolink.short_url}/products/${product.id}`}
          >
            {product.cover?.url && (
              <img className="aspect-video w-full object-cover" src={product.cover.url} alt="" loading="lazy" />
            )}
            <div className="flex items-center justify-between gap-3 p-3.5">
              <div className="min-w-0">
                <div className="truncate font-medium">{product.title}</div>
                {product.description && (
                  <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{product.description}</p>
                )}
              </div>
              <span className="shrink-0 font-semibold">
                {formatMoney(product.price_cents, product.currency)}
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {style: 'currency', currency}).format(cents / 100);
}

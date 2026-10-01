import {PackageOpenIcon} from 'lucide-react';
import {ProductCover} from '@ui/product-cover';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import type {PublicDigitalProduct} from '../digital-product-public-pages';
import {productTypeIcon, ProductTypeLabel} from './product-type';

export function ProductGallery({product}: {product: PublicDigitalProduct}) {
  const TypeIcon = productTypeIcon(product.type);

  const fallback = (
    <div className="flex size-full min-h-64 flex-col items-center justify-center gap-3 bg-[radial-gradient(circle_at_center,var(--biolink-surface-strong),transparent_68%)] px-6 text-center text-[var(--biolink-muted-text)] sm:min-h-80">
      <span className="grid size-14 place-items-center rounded-card bg-[var(--biolink-surface-strong)] shadow-xs ring-1 ring-[var(--biolink-border)]">
        <PackageOpenIcon className="size-5" />
      </span>
      <span className="text-xs">
        <Trans message="Secure access after purchase" />
      </span>
    </div>
  );

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-[var(--biolink-surface)]',
        product.cover?.url ? 'aspect-video' : 'min-h-64 sm:min-h-80',
      )}
    >
      {product.cover?.url ? (
        <ProductCover
          cover={product.cover}
          alt={product.title}
          className="size-full"
          fallback={fallback}
        />
      ) : (
        fallback
      )}

      <span className="absolute top-4 start-4 inline-flex items-center gap-1.5 rounded-full border border-[var(--biolink-border)] bg-[var(--biolink-surface-strong)] px-3 py-1 text-xs font-medium text-[var(--biolink-text)] shadow-xs">
        <TypeIcon className="size-3.5 shrink-0" aria-hidden="true" />
        <ProductTypeLabel type={product.type} />
      </span>
    </div>
  );
}

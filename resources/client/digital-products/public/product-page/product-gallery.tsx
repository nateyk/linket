import {biolinkSurfaceEdgeClassName} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {PackageOpenIcon} from 'lucide-react';
import {ProductCover} from '@ui/product-cover';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import type {PublicDigitalProduct} from '../digital-product-public-pages';
import {productTypeIcon, ProductTypeLabel} from './product-type';

export function ProductGallery({product}: {product: PublicDigitalProduct}) {
  const TypeIcon = productTypeIcon(product.type);

  const fallback = (
    <div className="flex size-full min-h-64 flex-col items-center justify-center gap-3 bg-[var(--biolink-surface-muted)] px-6 text-center text-[var(--biolink-muted-text)] sm:min-h-80">
      <span className="grid size-14 place-items-center rounded-card bg-[var(--biolink-surface-strong)] ring-1 ring-(color:--biolink-border)">
        <PackageOpenIcon className="size-5" />
      </span>
      <span className="text-xs">
        <Trans message="Image not available" />
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
          loading="eager"
          fallback={fallback}
        />
      ) : (
        fallback
      )}

      <span
        className={cn(
          'absolute start-4 top-4 inline-flex h-5 items-center gap-1.5 rounded-card-sm bg-[var(--biolink-surface-strong)] px-2 text-xs font-medium text-[var(--biolink-text)]',
          biolinkSurfaceEdgeClassName,
        )}
      >
        <TypeIcon className="size-3.5 shrink-0" aria-hidden="true" />
        <ProductTypeLabel type={product.type} />
      </span>
    </div>
  );
}

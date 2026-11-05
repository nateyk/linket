import type {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {ProductCard} from '@app/digital-products/shared/product-card';
import {
  biolinkSurfaceEdgeClassName,
  resolveBiolinkButtonAppearance,
} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {BriefcaseBusinessIcon, PackageIcon} from 'lucide-react';
import {serviceStartingPrice} from './service-price';
import type {PublicService} from './service-types';

/**
 * Services and digital products are both public store catalog items. Reuse the
 * shared ProductCard anatomy so the cover, title, description, metadata, price
 * and one View action align without a parallel service-only card implementation.
 * The service-only content (packages / starting price / quote) is still distinct.
 */
export function ServiceCard({
  service,
  appearance,
}: {
  service: PublicService;
  appearance?: BiolinkAppearanceConfig | null;
}) {
  const {trans} = useTrans();
  const price = serviceStartingPrice(service);
  const buttonAppearance = resolveBiolinkButtonAppearance(appearance);

  const fallback = (
    <div className="flex size-full items-center justify-center bg-[var(--biolink-surface-muted)] text-[var(--biolink-muted-text)]">
      <BriefcaseBusinessIcon className="size-8 opacity-65" aria-hidden="true" />
    </div>
  );

  return (
    <ProductCard
      quiet
      images={service.cover?.url ? [service.cover.url] : []}
      title={service.title}
      description={service.short_description}
      mediaOverlay={
        service.category ? (
          <Badge
            variant="secondary"
            className="bg-[var(--biolink-surface-strong)] text-[var(--biolink-text)]"
          >
            {service.category}
          </Badge>
        ) : undefined
      }
      meta={
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--biolink-muted-text)]">
          <PackageIcon className="size-4 shrink-0" aria-hidden="true" />
          <Trans
            message="[one :count package|other :count packages]"
            values={{count: service.packages_count}}
          />
        </span>
      }
      price={
        price ? (
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-xs font-medium leading-snug text-[var(--biolink-muted-text)]">
              <Trans message="Starting at" />
            </span>
            <span className="text-base leading-tight font-semibold tracking-tight tabular-nums sm:text-lg">
              {price}
            </span>
          </span>
        ) : (
          <Trans message="Request a quote" />
        )
      }
      action={
        <Button
          nativeButton={false}
          size="sm"
          variant="ghost"
          className={cn(
            buttonAppearance.className,
            'min-h-9 pointer-coarse:min-h-11',
          )}
          style={buttonAppearance.style}
          aria-label={trans(
            message('View :title', {values: {title: service.title}}),
          )}
          render={<a href={service.public_url} />}
        >
          <Trans message="View" />
        </Button>
      }
      imageFallback={fallback}
      style={{boxShadow: buttonAppearance.style.boxShadow}}
      classNames={{
        root: cn(
          'bg-[var(--biolink-surface)] text-[var(--biolink-text)]',
          biolinkSurfaceEdgeClassName,
        ),
        media: 'bg-[var(--biolink-surface-muted)]',
        body: 'gap-3 p-4',
        title:
          'line-clamp-2 text-base leading-snug font-semibold text-[var(--biolink-text)] sm:text-lg',
        description: 'text-[var(--biolink-muted-text)]',
        price:
          'min-w-0 text-base leading-snug font-semibold tracking-tight text-[var(--biolink-text)] tabular-nums sm:text-lg',
        footer: 'gap-3 pt-1',
      }}
    />
  );
}

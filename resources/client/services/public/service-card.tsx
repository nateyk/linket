import type {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {
  biolinkSurfaceEdgeClassName,
  resolveBiolinkButtonAppearance,
} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {ProductCover} from '@ui/product-cover';
import {useTrans} from '@ui/i18n/use-trans';
import {cn} from '@ui/utils/cn';
import {BriefcaseBusinessIcon, PackageIcon} from 'lucide-react';
import {serviceStartingPrice} from './service-price';
import type {PublicService} from './service-types';

/**
 * The storefront's service card. It uses the same rhythm as the product card
 * beside it in the shop: cover with the category as an overlay, title,
 * two-line summary, the package count, then price and one Appearance-styled
 * action on the bottom row. Surfaces and shadow come from the store, so the
 * two card kinds sit in one grid without a seam.
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
    <div
      className={cn(
        'group flex h-full w-full flex-col overflow-hidden rounded-card bg-[var(--biolink-surface)] text-[var(--biolink-text)]',
        biolinkSurfaceEdgeClassName,
      )}
      // The store's own Appearance → Shadow, exactly as the product and
      // creator cards take it.
      style={{boxShadow: buttonAppearance.style.boxShadow}}
    >
      <div className="relative aspect-video w-full overflow-hidden">
        <ProductCover
          cover={service.cover}
          alt={service.title}
          aspect=""
          className="h-full w-full bg-[var(--biolink-surface-muted)]"
          fallback={fallback}
        />

        {service.category && (
          <div className="absolute start-3 top-3 z-10">
            <Badge
              variant="secondary"
              className="bg-[var(--biolink-surface-strong)] text-[var(--biolink-text)]"
            >
              {service.category}
            </Badge>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 min-w-0 text-base leading-snug font-semibold sm:text-lg">
          {service.title}
        </h3>

        {service.short_description && (
          <p className="line-clamp-2 text-sm leading-relaxed text-[var(--biolink-muted-text)]">
            {service.short_description}
          </p>
        )}

        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--biolink-muted-text)]">
          <PackageIcon className="size-4 shrink-0" aria-hidden="true" />
          <Trans
            message="[one :count package|other :count packages]"
            values={{count: service.packages_count}}
          />
        </span>

        <div className="mt-auto flex items-center justify-between gap-3 pt-1">
          <span className="text-base leading-none font-semibold tracking-tight tabular-nums sm:text-lg">
            {price ? (
              <Trans message="From :price" values={{price}} />
            ) : (
              <Trans message="Request a quote" />
            )}
          </span>

          <Button
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
        </div>
      </div>
    </div>
  );
}
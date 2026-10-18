import {Badge} from '@shadcn/badge/badge';
import {Card} from '@shadcn/card/card';
import {Trans} from '@ui/i18n/trans';
import {BriefcaseBusinessIcon, PackageIcon} from 'lucide-react';
import {serviceStartingPrice} from './service-price';
import type {PublicService} from './service-types';

export function ServiceCard({service}: {service: PublicService}) {
  const price = serviceStartingPrice(service);

  return (
    <a
      href={service.public_url}
      className="group block h-full rounded-card outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card.Root className="flex h-full flex-col gap-0 overflow-hidden py-0">
        <div className="aspect-video overflow-hidden bg-[var(--biolink-surface-muted)]">
          {service.cover?.url ? (
            <img
              src={service.cover.url}
              alt=""
              loading="lazy"
              decoding="async"
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-[var(--biolink-muted-text)]">
              <BriefcaseBusinessIcon className="size-8 opacity-65" />
            </div>
          )}
        </div>

        <Card.Content className="flex flex-1 flex-col gap-2 p-4">
          {service.category && (
            <Badge variant="secondary" className="w-fit">
              {service.category}
            </Badge>
          )}
          <Card.Title className="text-base leading-6 font-semibold text-[var(--biolink-text)]">
            {service.title}
          </Card.Title>
          {service.short_description && (
            <p className="line-clamp-2 text-sm leading-relaxed text-[var(--biolink-muted-text)]">
              {service.short_description}
            </p>
          )}
        </Card.Content>

        <Card.Footer className="mt-auto flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
          <span className="font-semibold text-[var(--biolink-text)]">
            {price ? (
              <span className="inline-flex items-baseline gap-1">
                <Trans message="From" />
                <span>{price}</span>
              </span>
            ) : (
              <Trans message="Request a quote" />
            )}
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-[var(--biolink-muted-text)]">
            <PackageIcon className="size-3.5" />
            <Trans
              message=":count packages"
              values={{count: service.packages_count}}
            />
          </span>
        </Card.Footer>
      </Card.Root>
    </a>
  );
}

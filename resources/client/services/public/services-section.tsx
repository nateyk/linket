import type {Biolink} from '@app/gen/schemas/biolink';
import type {BiolinkAppearanceConfig} from '@app/gen/schemas/biolink-appearance-config';
import {apiClient} from '@common/http/query-client';
import {biolinkSurfaceEdgeClassName} from '@app/short-links/renderers/biolink-renderer/biolink-appearance';
import {Empty} from '@shadcn/empty/empty';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {BriefcaseBusinessIcon} from 'lucide-react';
import {useEffect, useState} from 'react';
import {ServiceCard} from './service-card';
import type {PublicService} from './service-types';

const gridClassName =
  'grid w-full grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))] gap-4 overflow-visible sm:gap-5';

type LoadState = 'loading' | 'ready' | 'error';

export function ServicesSection({
  biolink,
  appearance,
  showHeading = true,
}: {
  biolink: Biolink;
  appearance?: BiolinkAppearanceConfig | null;
  showHeading?: boolean;
}) {
  const [services, setServices] = useState<PublicService[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;
    setLoadState('loading');

    apiClient
      .get(`/api/v1/public/stores/${biolink.id}/services`)
      .then(response => {
        if (cancelled) return;
        setServices(
          ((response.data as {data?: PublicService[]}).data ?? []).slice(0, 6),
        );
        setLoadState('ready');
      })
      .catch(() => {
        // A failed request is not an empty shop: say so instead of claiming
        // the creator has nothing for sale.
        if (!cancelled) {
          setServices([]);
          setLoadState('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [biolink.id]);

  const emptySurfaceClassName = cn(
    'bg-[var(--biolink-surface)] py-10 text-[var(--biolink-text)]',
    biolinkSurfaceEdgeClassName,
  );

  return (
    <section className="flex min-w-0 flex-col gap-4">
      {showHeading && (
        <h2 className="text-xl leading-tight font-semibold tracking-tight text-[var(--biolink-text)] sm:text-2xl">
          <Trans message="Services" />
        </h2>
      )}

      {loadState === 'loading' ? (
        <div className={gridClassName}>
          {[1, 2].map(item => (
            <div key={item} className="flex flex-col gap-3">
              <Skeleton className="aspect-video w-full rounded-card" />
              <Skeleton className="h-5 w-3/4 rounded-card-xs" />
              <Skeleton className="h-4 w-full rounded-card-xs" />
              <Skeleton className="h-9 w-full rounded-card-xs" />
            </div>
          ))}
        </div>
      ) : loadState === 'error' ? (
        <Empty.Root className={emptySurfaceClassName}>
          <Empty.Header>
            <Empty.Media
              variant="icon"
              className="bg-[var(--biolink-surface-muted)] text-[var(--biolink-text)]"
            >
              <BriefcaseBusinessIcon />
            </Empty.Media>
            <Empty.Title>
              <Trans message="Couldn't load services" />
            </Empty.Title>
            <Empty.Description className="text-[var(--biolink-muted-text)]">
              <Trans message="Refresh the page and try again." />
            </Empty.Description>
          </Empty.Header>
        </Empty.Root>
      ) : services.length ? (
        <div className={gridClassName}>
          {services.map(service => (
            <ServiceCard
              key={service.id}
              service={service}
              appearance={appearance}
            />
          ))}
        </div>
      ) : (
        <Empty.Root className={emptySurfaceClassName}>
          <Empty.Header>
            <Empty.Media
              variant="icon"
              className="bg-[var(--biolink-surface-muted)] text-[var(--biolink-text)]"
            >
              <BriefcaseBusinessIcon />
            </Empty.Media>
            <Empty.Title>
              <Trans message="No services yet" />
            </Empty.Title>
            <Empty.Description className="text-[var(--biolink-muted-text)]">
              <Trans message="Check back soon, or open the profile for more about this creator." />
            </Empty.Description>
          </Empty.Header>
        </Empty.Root>
      )}
    </section>
  );
}
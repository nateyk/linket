import type {Biolink} from '@app/gen/schemas/biolink';
import {apiClient} from '@common/http/query-client';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Trans} from '@ui/i18n/trans';
import {ArrowRightIcon, BriefcaseBusinessIcon} from 'lucide-react';
import {useEffect, useState} from 'react';
import {ServiceCard} from './service-card';
import type {PublicService} from './service-types';

export function ServicesSection({
  biolink,
  showHeading = true,
}: {
  biolink: Biolink;
  showHeading?: boolean;
}) {
  const [services, setServices] = useState<PublicService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    apiClient
      .get(`/api/v1/public/stores/${biolink.id}/services`)
      .then(response => {
        if (cancelled) return;
        setServices(
          ((response.data as {data?: PublicService[]}).data ?? []).slice(0, 6),
        );
      })
      .catch(() => {
        if (!cancelled) setServices([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [biolink.id]);

  const servicesUrl = `${biolink.short_url}/services`;

  return (
    <section className="flex min-w-0 flex-col gap-4">
      {showHeading && (
        <h2 className="text-lg font-semibold text-[var(--biolink-text)]">
          <Trans message="Services" />
        </h2>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2].map(item => (
            <Skeleton key={item} className="h-64 w-full rounded-card" />
          ))}
        </div>
      ) : services.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {services.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-[var(--biolink-border)] px-6 py-10 text-center">
          <BriefcaseBusinessIcon className="size-8 text-[var(--biolink-muted-text)]" />
          <p className="text-sm text-[var(--biolink-muted-text)]">
            <Trans message="No services yet" />
          </p>
        </div>
      )}

      {services.length > 0 && (
        <a
          href={servicesUrl}
          className="inline-flex items-center gap-1 text-sm font-medium text-[var(--biolink-muted-text)] underline-offset-4 hover:text-[var(--biolink-text)] hover:underline"
        >
          <Trans message="View all services" />
          <ArrowRightIcon className="size-4" />
        </a>
      )}
    </section>
  );
}

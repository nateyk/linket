import {retrieveDomainOptions} from '@app/dashboard/custom-domains/domains-queries';
import {useTrackedEventsFilters} from '@app/dashboard/reports/tracked-events-filters';
import {
  TrackedEventsInsights,
  TrackedEventsInsightsDateAndFilterButtons,
} from '@app/dashboard/reports/tracked-events-insights';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Button} from '@shadcn/button/button';
import {useSuspenseQuery} from '@tanstack/react-query';
import {DateRangeValue} from '@ui/forms/input-field/date/date-range-picker/date-range-value';
import {DateRangePresets} from '@ui/forms/input-field/date/date-range-picker/dialog/date-range-presets';
import {useTrans} from '@ui/i18n/use-trans';
import {removeProtocol} from '@ui/utils/urls/remove-protocol';
import {useMemo, useState} from 'react';
import {Link} from 'react-router';
import {ArrowLeftIcon} from 'lucide-react';

export function Component() {
  const {routeType} = useDatatableRouteType();
  const {trans} = useTrans();
  const {domainId} = useRequiredParams(['domainId']);
  const query = useSuspenseQuery(retrieveDomainOptions(Number(domainId)));
  const domain = query.data.data;
  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    DateRangePresets[2]!.getRangeValue(),
  );
  const filters = useTrackedEventsFilters({isScopedToDomain: true});

  const forcedFilters = useMemo(
    () => ({
      domain_id: domainId,
    }),
    [domainId],
  );

  return (
    <>
      <StaticPageTitle>{removeProtocol(domain.host)}</StaticPageTitle>
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader className="max-lg:h-auto max-lg:flex-wrap max-lg:py-2">
          <DashboardLayout.SidebarToggle />
          <Button variant="ghost" size="icon-sm" className="max-lg:size-11" nativeButton={false}
            aria-label={trans({message: 'Back to branded domains'})}
            render={<Link to={`/${routeType}/custom-domains`} />}>
            <ArrowLeftIcon className="rtl:rotate-180" aria-hidden="true" />
          </Button>
          <DashboardLayout.SectionTitle render={<h1 />} className="max-lg:order-3 max-lg:basis-full max-lg:flex-none max-lg:w-full max-lg:text-xl max-lg:overflow-visible max-lg:whitespace-normal max-lg:text-clip">
            {removeProtocol(domain.host)}
          </DashboardLayout.SectionTitle>
          <div className="ms-auto flex min-w-0 items-center">
          <TrackedEventsInsightsDateAndFilterButtons
            dateRange={dateRange}
            setDateRange={setDateRange}
            filters={filters}
          />
          </div>
        </DashboardLayout.SectionHeader>
        <DashboardLayout.SectionContent className="overflow-y-auto">
          <TrackedEventsInsights
            dateRange={dateRange}
            allFilters={filters}
            forcedFilters={forcedFilters}
          />
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    </>
  );
}

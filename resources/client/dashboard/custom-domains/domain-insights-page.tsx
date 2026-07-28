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
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {useSuspenseQuery} from '@tanstack/react-query';
import {DateRangeValue} from '@ui/forms/input-field/date/date-range-picker/date-range-value';
import {DateRangePresets} from '@ui/forms/input-field/date/date-range-picker/dialog/date-range-presets';
import {Trans} from '@ui/i18n/trans';
import {removeProtocol} from '@ui/utils/urls/remove-protocol';
import {useMemo, useState} from 'react';

export function Component() {
  const {routeType} = useDatatableRouteType();
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
        <DashboardLayout.SectionHeader>
          <DashboardLayout.SidebarToggle />
          <Breadcrumb.Root className="text-xl">
            <Breadcrumb.Item>
              <Breadcrumb.Link to={`/${routeType}/custom-domains`}>
                <Trans message="Branded domains" />
              </Breadcrumb.Link>
            </Breadcrumb.Item>
            <Breadcrumb.Separator />
            <Breadcrumb.Item>
              <Breadcrumb.Page>{removeProtocol(domain.host)}</Breadcrumb.Page>
            </Breadcrumb.Item>
          </Breadcrumb.Root>
          <TrackedEventsInsightsDateAndFilterButtons
            dateRange={dateRange}
            setDateRange={setDateRange}
            filters={filters}
          />
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

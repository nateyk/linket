import {useTrackedEventsFilters} from '@app/dashboard/reports/tracked-events-filters';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {AdHost} from '@common/admin/ads/ad-host';
import {ReportDateSelector} from '@common/admin/analytics/report-date-selector';
import {AddFilterButton} from '@common/datatable/filters/add-filter-button';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Footer} from '@common/ui/footer/footer';
import {Tabs} from '@shadcn/tabs/tabs';
import {DateRangeValue} from '@ui/forms/input-field/date/date-range-picker/date-range-value';
import {DateRangePresets} from '@ui/forms/input-field/date/date-range-picker/dialog/date-range-presets';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {useState} from 'react';
import {Outlet, useLocation} from 'react-router';

export function Component() {
  const {links} = useSettings();
  const {routeType} = useDatatableRouteType();
  const {pathname} = useLocation();
  const selectedTab = pathname.endsWith('events') ? 'events' : 'engagements';

  const title = <Trans message="Insights" />;

  const [dateRange, setDateRange] = useState<DateRangeValue>(() =>
    DateRangePresets[2]!.getRangeValue(),
  );
  const trackedEventsFilters = useTrackedEventsFilters();

  return (
    <>
      <StaticPageTitle>{title}</StaticPageTitle>
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader>
          <DashboardLayout.SidebarToggle />
          <DashboardLayout.SectionTitle render={<h1 />}>{title}</DashboardLayout.SectionTitle>
          <div className="ms-auto flex shrink-0 items-center gap-2">
            <ReportDateSelector
              value={dateRange}
              onChange={setDateRange}
              compactOnMobile={false}
            />
            <AddFilterButton
              filters={trackedEventsFilters}
              color={null}
              variant="outline"
            />
          </div>
        </DashboardLayout.SectionHeader>
        <Tabs.Root value={selectedTab}>
          <div className="mx-(--section-spacing) border-b">
            <Tabs.List variant="line">
              <Tabs.LinkTab
                className="min-w-31"
                value="engagements"
                to={`/${routeType}/insights`}
                replace
              >
                <Trans message="Engagements" />
              </Tabs.LinkTab>
              <Tabs.LinkTab
                className="min-w-31"
                value="events"
                to={`/${routeType}/insights/events`}
                replace
              >
                <Trans message="Tracked events" />
              </Tabs.LinkTab>
            </Tabs.List>
          </div>
        </Tabs.Root>
        <AdHost slot="dashboard" className="mt-6" />
        <DashboardLayout.SectionContent className="overflow-y-auto">
          <FilterList filters={trackedEventsFilters} />
          <Outlet context={dateRange} />
          {links?.dash_footer && <Footer padding="mt-11" />}
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    </>
  );
}

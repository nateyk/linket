import {useTrackedEventsFilters} from '@app/dashboard/reports/tracked-events-filters';
import {getAnalyticsCardsData} from '@app/gen/analytics';
import {AdminReportCardRow} from '@common/admin/analytics/admin-report-card-row';
import {ReportDateSelector} from '@common/admin/analytics/report-date-selector';
import {AddFilterPopover} from '@common/datatable/filters/add-filter-popover';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Toggle} from '@shadcn/toggle';
import {ToggleGroup} from '@shadcn/toggle-group/toggle-group';
import {useQuery} from '@tanstack/react-query';
import {DateRangeValue} from '@ui/forms/input-field/date/date-range-picker/date-range-value';
import {DateRangePresets} from '@ui/forms/input-field/date/date-range-picker/dialog/date-range-presets';
import {Trans} from '@ui/i18n/trans';
import {useState} from 'react';
import {Outlet, useLocation, useNavigate} from 'react-router';

export interface AdminReportOutletContext {
  dateRange: DateRangeValue;
  setDateRange: (dateRange: DateRangeValue) => void;
}

export function Component() {
  const navigate = useNavigate();
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => {
    // This week
    return DateRangePresets[2]!.getRangeValue();
  });
  const {pathname} = useLocation();
  const channel = pathname.endsWith('visitors') ? 'visitors' : 'events';

  const title =
    channel === 'visitors' ? (
      <Trans message="Visitors" />
    ) : (
      <Trans message="Insights" />
    );

  const filters = useTrackedEventsFilters();

  return (
    <DashboardLayout.MainSection>
      <StaticPageTitle>{title}</StaticPageTitle>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>{title}</DashboardLayout.SectionTitle>
        <ToggleGroup
          variant="segmented"
          buttonVariant="ghost"
          value={[channel]}
        >
          <Toggle value="events" onClick={() => navigate('events')}>
            <Trans message="Events" />
          </Toggle>
          <Toggle value="visitors" onClick={() => navigate('visitors')}>
            <Trans message="Visitors" />
          </Toggle>
        </ToggleGroup>
        <ReportDateSelector value={dateRange} onChange={setDateRange} />
        {channel === 'events' && <AddFilterPopover filters={filters} />}
      </DashboardLayout.SectionHeader>
      <div className="flex flex-auto flex-col gap-5 overflow-auto p-3 md:p-6">
        <Header dateRange={dateRange} />
        {channel === 'events' && <FilterList filters={filters} />}
        <Outlet context={{dateRange, setDateRange}} />
      </div>
    </DashboardLayout.MainSection>
  );
}

interface HeaderProps {
  dateRange: DateRangeValue;
}
function Header({dateRange}: HeaderProps) {
  const {data} = useQuery({
    staleTime: Infinity,
    queryKey: ['analytics-cards-data', dateRange],
    queryFn: () =>
      getAnalyticsCardsData({
        start_date: dateRange.start.toAbsoluteString(),
        end_date: dateRange.end.toAbsoluteString(),
        timezone: dateRange.start.timeZone,
      }),
  });
  return (
    <div className="chart-grid">
      <AdminReportCardRow data={data?.data} />
    </div>
  );
}

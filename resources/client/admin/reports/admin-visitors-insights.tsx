import {AdminReportOutletContext} from '@app/admin/reports/admin-insights-page-layout';
import {generateVisitorsReport} from '@app/gen/analytics';
import {VisitorsReportCharts} from '@common/admin/analytics/visitors-report-charts';
import {useQuery} from '@tanstack/react-query';
import {useOutletContext} from 'react-router';

export function Component() {
  const {dateRange} = useOutletContext<AdminReportOutletContext>();
  const params = {
    start_date: dateRange.start.toAbsoluteString(),
    end_date: dateRange.end.toAbsoluteString(),
    timezone: dateRange.start.timeZone,
  };
  const {data, isLoading, isPlaceholderData} = useQuery({
    staleTime: Infinity,
    queryKey: ['admin-visitors-report', params],
    queryFn: () =>
      generateVisitorsReport({
        ...params,
      }),
  });
  return (
    <VisitorsReportCharts
      isLoading={isLoading || isPlaceholderData}
      report={data?.data}
    />
  );
}

import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {StatisticsPanel} from '@app/digital-products/shared/product-statistics/statistics-panel';
import {Trans} from '@ui/i18n/trans';
import {useParams} from 'react-router';

export function Component() {
  const {productId} = useParams();

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Statistics" />
        </DashboardLayout.SectionTitle>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 py-4">
          <StatisticsPanel
            productId={productId ?? ''}
            queryKey={['creatorProductStatistics']}
            endpoint={`/api/v1/items/${productId}/statistics`}
          />
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}
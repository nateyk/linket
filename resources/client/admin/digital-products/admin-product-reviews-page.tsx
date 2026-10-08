import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {ArrowLeftIcon} from 'lucide-react';
import {Link, useParams} from 'react-router';
import {AdminProductReviewsTable} from './admin-product-reviews-table';

export function Component() {
  const {productId} = useParams();

  return (
    <DashboardLayout.MainSection>
      <StaticPageTitle>
        <Trans message="Product Reviews" />
      </StaticPageTitle>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Product Reviews" />
        </DashboardLayout.SectionTitle>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/admin/digital-products" />}
        >
          <ArrowLeftIcon />
          <Trans message="Back to products" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <AdminProductReviewsTable productId={productId ?? ''} />
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}
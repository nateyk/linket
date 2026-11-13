import {useHcManagerBasePath} from '@app/help-center/manager/hc-manager-paths';
import {
  DatatablePageHeaderBar,
  DatatablePageScrollContainer,
  DatatablePageWithHeaderBody,
  DatatablePageWithHeaderLayout,
} from '@common/datatable/page/datatable-page-with-header-layout';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {Button} from '@ui/buttons/button';
import {Trans} from '@ui/i18n/trans';
import {Fragment, ReactNode} from 'react';
import {Link} from 'react-router';
import {HcManagerTabs} from '@app/help-center/manager/layout/hc-manager-tabs';

interface Props {
  actionButton?: ReactNode;
  children: ReactNode;
  title: ReactNode;
}
export function HcManagerLayout({actionButton, children, title}: Props) {
  const isAdmin = useHcManagerBasePath() === '/admin/help';
  return (
    <DatatablePageWithHeaderLayout>
      <StaticPageTitle>
        <Trans message="Help center" />
      </StaticPageTitle>
      <DatatablePageHeaderBar
        title={title}
        showSidebarToggleButton
        border="border-none"
        rightContent={
          <Fragment>
            {isAdmin && (
              <Button variant="outline" size="xs" elementType={Link} to="/admin/settings/hc" className="max-sm:hidden">
                <Trans message="Settings" />
              </Button>
            )}
            {actionButton}
          </Fragment>
        }
      />
      <HcManagerTabs />
      <DatatablePageWithHeaderBody>
        <DatatablePageScrollContainer>{children}</DatatablePageScrollContainer>
      </DatatablePageWithHeaderBody>
    </DatatablePageWithHeaderLayout>
  );
}

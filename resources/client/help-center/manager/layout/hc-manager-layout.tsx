import {HcAdminSettingsButton} from '@app/help-center/manager/layout/hc-admin-settings-button';
import {
  DatatablePageHeaderBar,
  DatatablePageScrollContainer,
  DatatablePageWithHeaderBody,
  DatatablePageWithHeaderLayout,
} from '@common/datatable/page/datatable-page-with-header-layout';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {Trans} from '@ui/i18n/trans';
import {Fragment, ReactNode} from 'react';
import {HcManagerTabs} from '@app/help-center/manager/layout/hc-manager-tabs';

interface Props {
  actionButton?: ReactNode;
  children: ReactNode;
  title: ReactNode;
}
export function HcManagerLayout({actionButton, children, title}: Props) {
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
            <HcAdminSettingsButton />
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

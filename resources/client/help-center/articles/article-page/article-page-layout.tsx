import {HcSearchBar} from '@app/help-center/search/hc-search-bar';
import {DashboardContent} from '@common/ui/dashboard-layout/dashboard-content';
import {DashboardLayout} from '@common/ui/dashboard-layout/dashboard-layout';
import {DashboardNavbar} from '@common/ui/dashboard-layout/dashboard-navbar';
import {
  DashboardSidenav,
  DashboardSidenavChildrenProps,
} from '@common/ui/dashboard-layout/dashboard-sidenav';
import {ReactElement, ReactNode} from 'react';

interface Props {
  children: ReactNode;
  leftSidenav: ReactElement<DashboardSidenavChildrenProps>;
  rightSidenav?: ReactNode;
  categoryId?: number;
}
export function ArticlePageLayout({
  children,
  leftSidenav,
  rightSidenav,
  categoryId,
}: Props) {
  return (
    <DashboardLayout
      height="h-auto"
      gridClassName="hc-grid"
      name="hc-article"
      blockBodyOverflow={false}
    >
      <DashboardNavbar
        color="bg"
        menuPosition="header"
        className="sticky top-0 z-10 flex-shrink-0"
        size="md"
      >
        <HcSearchBar categoryId={categoryId} />
      </DashboardNavbar>
      <DashboardSidenav
        position="left"
        size="w-87.5"
        overflow="overflow-initial"
        className="ml-auto justify-end"
      >
        {leftSidenav}
      </DashboardSidenav>
      <DashboardContent isScrollable={false}>
        <main className="mx-auto min-w-0 w-full max-w-3xl px-16 py-24 sm:px-24 md:py-48 lg:px-32 xl:px-48">
          {children}
        </div>
      </DashboardContent>
      {rightSidenav}
    </DashboardLayout>
  );
}

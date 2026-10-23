import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import type {ReactNode} from 'react';

/** Main column chrome for My Portal — mirrors Account Settings layout pattern only. */
export function PortalSectionLayout({
  title,
  children,
  headerRightContent,
}: {
  title: ReactNode;
  children: ReactNode;
  headerRightContent?: ReactNode;
}) {
  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <h1>{title}</h1>
        </DashboardLayout.SectionTitle>
        {headerRightContent}
      </DashboardLayout.SectionHeader>
      <div className="w-full flex-auto overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl p-6">{children}</div>
      </div>
    </DashboardLayout.MainSection>
  );
}

import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {ReactNode} from 'react';

type Props = {
  children: ReactNode;
  title: ReactNode;
  headerRightContent?: ReactNode;
};
export function AccountSettingsPageLayout({
  children,
  title,
  headerRightContent,
}: Props) {
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

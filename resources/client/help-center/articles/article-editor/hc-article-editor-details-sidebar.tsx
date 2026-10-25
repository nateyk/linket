import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Sidebar} from '@common/ui/dashboard/sidebar';
import {Trans} from '@ui/i18n/trans';
import {ReactNode} from 'react';

interface Props {
  children: ReactNode;
}

export function HcArticleEditorDetailsSidebar({children}: Props) {
  return (
    <Sidebar.Root
      side="right"
      variant="floating"
      collapsible="offcanvas"
      width="w-[350px]"
      className="shrink-0"
    >
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4 md:px-6">
        <DashboardLayout.SectionTitle className="flex-1">
          <Trans message="Details" />
        </DashboardLayout.SectionTitle>
        <DashboardLayout.SidebarToggle sidebar="right" />
      </div>
      <Sidebar.Content className="compact-scrollbar flex-1 overflow-y-auto p-6">
        {children}
      </Sidebar.Content>
    </Sidebar.Root>
  );
}

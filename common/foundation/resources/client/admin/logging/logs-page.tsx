import {AdminDocsUrls} from '@app/admin/admin-config';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Tabs} from '@shadcn/tabs/tabs';
import {Trans} from '@ui/i18n/trans';
import {Outlet, useMatch} from 'react-router';

export function Component() {
  const match = useMatch('/admin/logs/:tab');
  const selectedTab = match?.params.tab ?? 'schedule';

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader className="border-none">
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Title tab={selectedTab} />
        </DashboardLayout.SectionTitle>
        {AdminDocsUrls.pages.logs ? (
          <DocsLink variant="button" link={AdminDocsUrls.pages.logs} />
        ) : null}
      </DashboardLayout.SectionHeader>
      <Tabs.Root value={selectedTab}>
        <div className="border-b px-6">
          <Tabs.List variant="line">
            <Tabs.LinkTab
              className="min-w-25"
              value="schedule"
              to="/admin/logs/schedule"
              replace
            >
              <Trans message="Schedule" />
            </Tabs.LinkTab>
            <Tabs.LinkTab
              className="min-w-25"
              value="error"
              to="/admin/logs/error"
              replace
            >
              <Trans message="Error" />
            </Tabs.LinkTab>
            <Tabs.LinkTab
              className="min-w-25"
              value="outgoing-email"
              to="/admin/logs/outgoing-email"
              replace
            >
              <Trans message="Email" />
            </Tabs.LinkTab>
          </Tabs.List>
        </div>
      </Tabs.Root>
      <Outlet />
    </DashboardLayout.MainSection>
  );
}

interface TitleProps {
  tab: string;
}
function Title({tab}: TitleProps) {
  switch (tab) {
    case 'schedule':
      return <Trans message="CRON schedule log" />;
    case 'error':
      return <Trans message="Error log" />;
    case 'outgoing-email':
      return <Trans message="Outgoing email log" />;
  }
}

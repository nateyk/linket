import {WebhookActionsButton} from '@app/account-settings/webhooks/webhook-actions-button';
import {retrieveWebhookOptions} from '@app/account-settings/webhooks/webhook-queries';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Tabs} from '@shadcn/tabs/tabs';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {Outlet, useLocation, useNavigate} from 'react-router';

export function Component() {
  const navigate = useNavigate();
  const {webhookId} = useRequiredParams(['webhookId']);
  const query = useSuspenseQuery(retrieveWebhookOptions(webhookId));
  const {pathname} = useLocation();
  const selectedTab = pathname.endsWith('/settings') ? 'settings' : 'logs';

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader className="border-none">
        <DashboardLayout.SidebarToggle />
        <Breadcrumb.Root className="text-xl">
          <Breadcrumb.Item>
            <Breadcrumb.Link to="/account-settings/webhooks">
              <Trans message="Webhooks" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>{query.data.data.name}</Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.Root>
        <WebhookActionsButton
          hideDetailsItems
          variant="outline"
          webhook={query.data.data}
          onDelete={() => navigate(`/account-settings/webhooks`)}
          onToggleEnabled={() => navigate(`/account-settings/webhooks`)}
        />
      </DashboardLayout.SectionHeader>
      <Tabs.Root value={selectedTab}>
        <div className="mx-6 border-b">
          <Tabs.List variant="line">
            <Tabs.LinkTab
              value="logs"
              to={`/account-settings/webhooks/${webhookId}`}
              replace
            >
              <Trans message="Attemps" />
            </Tabs.LinkTab>
            <Tabs.LinkTab
              value="settings"
              to={`/account-settings/webhooks/${webhookId}/settings`}
              replace
            >
              <Trans message="Details" />
            </Tabs.LinkTab>
          </Tabs.List>
        </div>
      </Tabs.Root>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <Outlet />
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

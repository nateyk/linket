import {Tabs} from '@shadcn/tabs/tabs';
import {Trans} from '@ui/i18n/trans';
import {useMatch} from 'react-router';

export function MailTabs() {
  const match = useMatch('/admin/settings/email/:page');
  const selectedTab =
    match?.params.page === 'incoming' ? 'incoming' : 'outgoing';
  return (
    <Tabs.Root value={selectedTab}>
      <div className="mx-6 border-b">
        <Tabs.List variant="line">
          <Tabs.LinkTab value="outgoing" to="/admin/settings/email/outgoing">
            <Trans message="Outgoing" />
          </Tabs.LinkTab>
          <Tabs.LinkTab value="incoming" to="/admin/settings/email/incoming">
            <Trans message="Incoming" />
          </Tabs.LinkTab>
        </Tabs.List>
      </div>
    </Tabs.Root>
  );
}

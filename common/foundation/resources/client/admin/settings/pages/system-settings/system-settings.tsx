import {CacheSettings} from '@common/admin/settings/pages/system-settings/cache-settings';
import {LicensePage} from '@common/admin/settings/pages/system-settings/license-page';
import {LoggingSettings} from '@common/admin/settings/pages/system-settings/logging-settings';
import {QueueSettings} from '@common/admin/settings/pages/system-settings/queue-settings';
import {UpdatePage} from '@common/admin/settings/pages/system-settings/update-page/update-page';
import {WebsocketSettings} from '@common/admin/settings/pages/system-settings/websocket-settings';
import {useAdminSettings} from '@common/admin/settings/use-admin-settings';
import {Badge} from '@shadcn/badge/badge';
import {Tabs} from '@shadcn/tabs/tabs';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {ReactElement, useMemo} from 'react';
import {useSearchParams} from 'react-router';

const allTabs = [
  {
    name: 'license',
    label: <Trans message="License" />,
  },
  {
    name: 'updates',
    label: <Trans message="Updates" />,
  },
  {
    name: 'cache',
    label: <Trans message="Cache" />,
  },
  {
    name: 'queue',
    label: <Trans message="Queue" />,
  },
  {
    name: 'logging',
    label: <Trans message="Logging" />,
  },
  {
    name: 'websockets',
    label: <Trans message="Websockets" />,
  },
] as const;

type TabName = (typeof allTabs)[number]['name'];

export function Component() {
  const {websockets} = useSettings();
  const [searchParams, setSearchParams] = useSearchParams();

  const filteredTabs = useMemo(
    () =>
      allTabs.filter(
        tab => tab.name !== 'websockets' || websockets?.integrated,
      ),
    [websockets],
  );

  const searchParamTab = searchParams.get('tab');
  const tabName = filteredTabs.some(tab => tab.name === searchParamTab)
    ? (searchParamTab as TabName)
    : 'license';

  return (
    <TabContent
      tabName={tabName}
      tabs={
        <Tabs.Root
          value={tabName}
          onValueChange={value => {
            setSearchParams({tab: value as TabName}, {replace: true});
          }}
        >
          <div className="mx-6 border-b">
            <Tabs.List variant="line">
              {filteredTabs.map(tab => (
                <Tabs.Tab key={tab.name} value={tab.name}>
                  {tab.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </div>
        </Tabs.Root>
      }
    />
  );
}

interface TabContentProps {
  tabName: TabName;
  tabs: ReactElement;
}
function TabContent({tabName, tabs}: TabContentProps) {
  const {data} = useAdminSettings();
  const title = <Trans message="System" />;
  const rightContent = (
    <Badge variant="secondary">{data.server.app_version}</Badge>
  );
  switch (tabName) {
    case 'cache':
      return <CacheSettings tabs={tabs} title={title} />;
    case 'queue':
      return <QueueSettings tabs={tabs} title={title} />;
    case 'logging':
      return <LoggingSettings tabs={tabs} title={title} />;
    case 'websockets':
      return <WebsocketSettings tabs={tabs} title={title} />;
    case 'license':
      return (
        <LicensePage tabs={tabs} title={title} rightContent={rightContent} />
      );
    case 'updates':
      return (
        <UpdatePage tabs={tabs} title={title} rightContent={rightContent} />
      );
  }
}

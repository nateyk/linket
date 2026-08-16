import {CacheSettings} from '@common/admin/settings/pages/system-settings/cache-settings';
import {LoggingSettings} from '@common/admin/settings/pages/system-settings/logging-settings';
import {QueueSettings} from '@common/admin/settings/pages/system-settings/queue-settings';
import {WebsocketSettings} from '@common/admin/settings/pages/system-settings/websocket-settings';
import {Tabs} from '@shadcn/tabs/tabs';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {ReactElement, useMemo} from 'react';
import {useSearchParams} from 'react-router';

const allTabs = [
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
    : 'cache';

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
  const title = <Trans message="System" />;
  switch (tabName) {
    case 'cache':
      return <CacheSettings tabs={tabs} title={title} />;
    case 'queue':
      return <QueueSettings tabs={tabs} title={title} />;
    case 'logging':
      return <LoggingSettings tabs={tabs} title={title} />;
    case 'websockets':
      return <WebsocketSettings tabs={tabs} title={title} />;
  }
}

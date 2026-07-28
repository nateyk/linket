import {BehaviourSettings} from '@app/admin/settings/link-settings/behaviour-settings';
import {DomainsSettings} from '@app/admin/settings/link-settings/domains-settings';
import {SecuritySettings} from '@app/admin/settings/link-settings/security-settings';
import {Tabs} from '@shadcn/tabs/tabs';
import {Trans} from '@ui/i18n/trans';
import {Fragment, ReactElement} from 'react';
import {useSearchParams} from 'react-router';

const allTabs = [
  {
    name: 'behaviour',
    label: <Trans message="Behaviour" />,
  },
  {
    name: 'security',
    label: <Trans message="Security" />,
  },
  {
    name: 'domains',
    label: <Trans message="Domains" />,
  },
] as const;

type TabName = (typeof allTabs)[number]['name'];

export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamTab = searchParams.get('tab');
  const tabName = allTabs.some(tab => tab.name === searchParamTab)
    ? (searchParamTab as TabName)
    : 'behaviour';

  return (
    <Fragment>
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
                {allTabs.map(tab => (
                  <Tabs.Tab key={tab.name} value={tab.name}>
                    {tab.label}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </div>
          </Tabs.Root>
        }
      />
    </Fragment>
  );
}

interface TabContentProps {
  tabName: TabName;
  tabs: ReactElement;
}
function TabContent({tabName, tabs}: TabContentProps) {
  const title = <Trans message="Links" />;
  switch (tabName) {
    case 'behaviour':
      return <BehaviourSettings tabs={tabs} title={title} />;
    case 'security':
      return <SecuritySettings tabs={tabs} title={title} />;
    case 'domains':
      return <DomainsSettings tabs={tabs} title={title} />;
  }
}

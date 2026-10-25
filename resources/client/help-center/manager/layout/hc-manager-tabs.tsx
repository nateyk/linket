import {Trans} from '@ui/i18n/trans';
import {Tab} from '@ui/tabs/tab';
import {TabList} from '@ui/tabs/tab-list';
import {Tabs} from '@ui/tabs/tabs';
import {Link, useLocation} from 'react-router';

const tabConfig = [
  {uri: '/agent/hc/arrange', label: {message: 'Structure'}},
  {uri: '/agent/hc/articles', label: {message: 'All articles'}},
];

export function HcManagerTabs() {
  const {pathname} = useLocation();
  const activeTab = pathname.startsWith('/agent/hc/articles') ? 1 : 0;

  return (
    <Tabs selectedTab={activeTab}>
      <TabList className="mx-6">
        {tabConfig.map(tab => (
          <Tab key={tab.uri} elementType={Link} to={tab.uri}>
            <Trans {...tab.label} />
          </Tab>
        ))}
      </TabList>
    </Tabs>
  );
}

import {useHcManagerBasePath} from '@app/help-center/manager/hc-manager-paths';
import {Trans} from '@ui/i18n/trans';
import {Tab} from '@ui/tabs/tab';
import {TabList} from '@ui/tabs/tab-list';
import {Tabs} from '@ui/tabs/tabs';
import {Link, useLocation} from 'react-router';

export function HcManagerTabs() {
  const root = useHcManagerBasePath();
  const {pathname} = useLocation();
  const activeTab = pathname.startsWith(`${root}/articles`) ? 1 : 0;
  const tabConfig = [
    {uri: `${root}/arrange`, label: {message: 'Structure'}},
    {uri: `${root}/articles`, label: {message: 'All articles'}},
  ];

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

import {HelpArticlesTab} from '@common/admin/help/help-articles-tab';
import {HelpCategoriesTab} from '@common/admin/help/help-categories-tab';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Tabs} from '@shadcn/tabs/tabs';
import {Trans} from '@ui/i18n/trans';
import {Fragment} from 'react';
import {useSearchParams} from 'react-router';

const allTabs = [
  {
    name: 'categories',
    label: <Trans message="Categories" />,
  },
  {
    name: 'articles',
    label: <Trans message="Articles" />,
  },
] as const;

type TabName = (typeof allTabs)[number]['name'];

export function Component() {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchParamTab = searchParams.get('tab');
  const tabName = allTabs.some(tab => tab.name === searchParamTab)
    ? (searchParamTab as TabName)
    : 'categories';

  return (
    <Fragment>
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader>
          <DashboardLayout.SidebarToggle />
          <DashboardLayout.SectionTitle>
            <Trans message="Help center" />
          </DashboardLayout.SectionTitle>
        </DashboardLayout.SectionHeader>
        <Tabs.Root
          value={tabName}
          onValueChange={value => {
            setSearchParams({tab: value as TabName}, {replace: true});
          }}
        >
          <div className="border-b px-(--section-spacing)">
            <Tabs.List variant="line">
              {allTabs.map(tab => (
                <Tabs.Tab key={tab.name} value={tab.name}>
                  {tab.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </div>
          <DashboardLayout.SectionContent>
            {tabName === 'categories' && <HelpCategoriesTab />}
            {tabName === 'articles' && <HelpArticlesTab />}
          </DashboardLayout.SectionContent>
        </Tabs.Root>
      </DashboardLayout.MainSection>
    </Fragment>
  );
}

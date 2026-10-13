import {BlogArticlesDatatablePage} from '@common/admin/blog/blog-articles-datatable-page';
import {BlogCategoriesTab} from '@common/admin/blog/blog-categories-tab';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {Tabs} from '@shadcn/tabs/tabs';
import {Trans} from '@ui/i18n/trans';
import {Fragment} from 'react';
import {FolderIcon, NewspaperIcon} from 'lucide-react';

export function Component() {
  return (
    <Fragment>
      <DashboardLayout.MainSection>
        <StaticPageTitle>
          <Trans message="Blog" />
        </StaticPageTitle>
        <DashboardLayout.SectionHeader>
          <DashboardLayout.SidebarToggle />
          <DashboardLayout.SectionTitle>
            <Trans message="Blog" />
          </DashboardLayout.SectionTitle>
        </DashboardLayout.SectionHeader>
        <Tabs.Root defaultValue="articles">
          <div className="border-b px-(--section-spacing)">
            <Tabs.List variant="line">
              <Tabs.Tab value="articles">
                <NewspaperIcon />
                <Trans message="Articles" />
              </Tabs.Tab>
              <Tabs.Tab value="categories">
                <FolderIcon />
                <Trans message="Categories" />
              </Tabs.Tab>
            </Tabs.List>
          </div>
          <Tabs.Panel value="articles">
            <BlogArticlesDatatablePage />
          </Tabs.Panel>
          <Tabs.Panel value="categories">
            <BlogCategoriesTab />
          </Tabs.Panel>
        </Tabs.Root>
      </DashboardLayout.MainSection>
    </Fragment>
  );
}

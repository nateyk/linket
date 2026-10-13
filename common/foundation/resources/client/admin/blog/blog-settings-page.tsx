import {BlogArticlesDatatablePage} from '@common/admin/blog/blog-articles-datatable-page';
import {BlogCategoriesTab} from '@common/admin/blog/blog-categories-tab';
import {Tabs} from '@shadcn/tabs/tabs';
import {Trans} from '@ui/i18n/trans';
import {NewspaperIcon, FolderIcon} from 'lucide-react';

export function Component() {
  return (
    <Tabs.Root defaultValue="articles">
      <Tabs.List className="mb-6">
        <Tabs.Tab value="articles">
          <NewspaperIcon className="size-4 mr-2" />
          <Trans message="Articles" />
        </Tabs.Tab>
        <Tabs.Tab value="categories">
          <FolderIcon className="size-4 mr-2" />
          <Trans message="Categories" />
        </Tabs.Tab>
      </Tabs.List>
      <Tabs.Panel value="articles">
        <BlogArticlesDatatablePage />
      </Tabs.Panel>
      <Tabs.Panel value="categories">
        <BlogCategoriesTab />
      </Tabs.Panel>
    </Tabs.Root>
  );
}
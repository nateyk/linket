import {Tab} from '@shadcn/tabs/tabs';
import {BlogArticlesDatatablePage} from '@common/admin/blog/blog-articles-datatable-page';
import {BlogCategoriesTab} from '@common/admin/blog/blog-categories-tab';
import {Tabs} from '@shadcn/tabs/tabs';
import {Trans} from '@ui/i18n/trans';
import {NewspaperIcon, FolderIcon} from 'lucide-react';

export function BlogSettingsPage() {
  return (
    <Tabs defaultValue="articles">
      <Tabs.List className="mb-6">
        <Tabs.Trigger value="articles">
          <NewspaperIcon className="size-4 mr-2" />
          <Trans message="Articles" />
        </Tabs.Trigger>
        <Tabs.Trigger value="categories">
          <FolderIcon className="size-4 mr-2" />
          <Trans message="Categories" />
        </Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="articles">
        <BlogArticlesDatatablePage />
      </Tabs.Content>
      <Tabs.Content value="categories">
        <BlogCategoriesTab />
      </Tabs.Content>
    </Tabs>
  );
}
import {AdminDocsUrls} from '@app/admin/admin-config';
import {CustomPageCard} from '@common/admin/custom-pages/custom-page-card';
import {listCustomPagesOptions} from '@common/admin/custom-pages/custom-pages-queries';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {LinkButton} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {TableSearchInput} from '@shadcn/table/utils/table-search-input';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useFilter} from '@ui/i18n/use-filter';
import {NewspaperIcon, PlusIcon} from 'lucide-react';
import {useMemo} from 'react';

export function Component() {
  const {isFiltering, searchParams} = useTableQueryState();
  const filter = useFilter({
    sensitivity: 'base',
  });
  const query = useSuspenseQuery(listCustomPagesOptions());
  const items = query.data.data;

  const filteredItems = useMemo(() => {
    if (!searchParams.query) {
      return items ?? [];
    }
    return (items ?? []).filter(item =>
      filter.contains(item.title ?? '', searchParams.query as string),
    );
  }, [items, searchParams.query, filter]);

  return (
    <DashboardLayout.MainSection>
      <StaticPageTitle>
        <Trans message="Custom pages" />
      </StaticPageTitle>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <h1>
            <Trans message="Custom pages" />
          </h1>
        </DashboardLayout.SectionTitle>
        {AdminDocsUrls.pages.customPages ? (
          <DocsLink variant="button" link={AdminDocsUrls.pages.customPages} />
        ) : null}
        <NewCustomPageButton />
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent>
        <DashboardLayout.SectionContentHeader>
          <TableSearchInput className="mr-auto" debounce={false} />
        </DashboardLayout.SectionContentHeader>
        <DashboardLayout.SectionScrollContainer className="flex flex-col gap-4">
          {filteredItems.map(page => (
            <CustomPageCard key={page.id} page={page} />
          ))}
          {filteredItems.length === 0 && (
            <CustomPagesEmptyState isFiltering={isFiltering} />
          )}
        </DashboardLayout.SectionScrollContainer>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function NewCustomPageButton() {
  return (
    <LinkButton variant="default" color="primary" to="new">
      <PlusIcon />
      <Trans message="New page" />
    </LinkButton>
  );
}

function CustomPagesEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <NewspaperIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching pages" />
          ) : (
            <Trans message="No pages have been created yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query." />
          ) : (
            <Trans message="Get started by adding your first custom page." />
          )}
        </Empty.Description>
      </Empty.Header>
      {!isFiltering && (
        <Empty.Content>
          <NewCustomPageButton />
        </Empty.Content>
      )}
    </Empty.Root>
  );
}

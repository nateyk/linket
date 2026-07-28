import {OutgoingEmailLogItem} from '@app/gen/schemas/outgoing-email-log-item';
import {
  outgoingEmailDatatableColumns,
  PreviewEmailButton,
  StatusBadge,
} from '@common/admin/logging/outgoing-email/outgoing-email-log-datatable-columns';
import {OutgoingEmailLogDatatableFilters} from '@common/admin/logging/outgoing-email/outgoing-email-log-datatable-filters';
import {listOutgoingEmailLogItemsOptions} from '@common/admin/logging/outgoing-email/outgoing-email-queries';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {AddFilterPopover} from '@common/datatable/filters/add-filter-popover';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {buttonVariants} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {Item} from '@shadcn/item/item';
import {GenericTable} from '@shadcn/table/generic-table';
import {TablePagination} from '@shadcn/table/utils/table-pagination';
import {TableSearchInput} from '@shadcn/table/utils/table-search-input';
import {useTable} from '@shadcn/table/utils/use-table';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {useSuspenseQuery} from '@tanstack/react-query';
import {FormattedRelativeTime} from '@ui/i18n/formatted-relative-time';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {cn} from '@ui/utils/cn';
import {DownloadIcon, MailIcon} from 'lucide-react';
import {use} from 'react';

export function Component() {
  const {isMobileMode} = use(DashboardLayoutContext);
  const {
    queryState,
    setQueryState,
    deferredSearchParams,
    isFiltering,
    isLoading,
  } = useTableQueryState({filters: OutgoingEmailLogDatatableFilters});

  const query = useSuspenseQuery(
    listOutgoingEmailLogItemsOptions(deferredSearchParams),
  );
  const items = query.data?.data ?? [];

  const table = useTable({
    data: items,
    columns: outgoingEmailDatatableColumns,
    enableMultiRowSelection: false,
    sort: queryState.sort,
    onSortChange: sort => setQueryState({sort}),
    pagination: {
      per_page: queryState.per_page,
      page: queryState.page,
    },
    onPaginationChange: pagination => setQueryState({...pagination}),
    response: query.data,
  });

  useShowGlobalLoadingBar({isLoading});

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionContent>
        <DashboardLayout.SectionContentHeader>
          <TableSearchInput />
          <AddFilterPopover
            filters={OutgoingEmailLogDatatableFilters}
            className="mr-auto"
          />
          <DownloadOutgoingEmailLogButton className="ml-auto" />
        </DashboardLayout.SectionContentHeader>
        <FilterList filters={OutgoingEmailLogDatatableFilters} />
        <DashboardLayout.SectionScrollContainer>
          {isMobileMode ? (
            <OutgoingEmailLogMobileList items={items} />
          ) : (
            <GenericTable table={table} />
          )}
          {!items.length && (
            <OutgoingEmailLogEmptyState isFiltering={isFiltering} />
          )}
          <TablePagination table={table} />
        </DashboardLayout.SectionScrollContainer>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function OutgoingEmailLogMobileList({items}: {items: OutgoingEmailLogItem[]}) {
  return (
    <Item.Group>
      {items.map(item => (
        <Item.Root key={item.id} variant="outline">
          <Item.Content>
            <Item.Title className="flex items-center gap-2">
              <div className="truncate">{item.subject}</div>
              <StatusBadge status={item.status} />
            </Item.Title>
            {item.created_at ? (
              <Item.Description>
                <FormattedRelativeTime date={item.created_at} />
              </Item.Description>
            ) : null}
            <Item.Row className="truncate text-muted-foreground">
              {item.to}
            </Item.Row>
          </Item.Content>
          <Item.Actions>
            <PreviewEmailButton item={item} />
          </Item.Actions>
        </Item.Root>
      ))}
    </Item.Group>
  );
}

function DownloadOutgoingEmailLogButton({className}: {className?: string}) {
  const {base_url} = useSettings();
  return (
    <a
      className={cn(
        buttonVariants({
          variant: 'outline',
          color: 'default',
          size: 'default',
          className,
        }),
      )}
      href={`${base_url}/api/v1/logs/outgoing-email/download`}
      download
    >
      <DownloadIcon />
      <Trans message="Download log" />
    </a>
  );
}

function OutgoingEmailLogEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <MailIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching emails" />
          ) : (
            <Trans message="No outgoing emails have been logged yet" />
          )}
        </Empty.Title>
        {isFiltering ? (
          <Empty.Description>
            <Trans message="Try another search query or different filters." />
          </Empty.Description>
        ) : null}
      </Empty.Header>
    </Empty.Root>
  );
}

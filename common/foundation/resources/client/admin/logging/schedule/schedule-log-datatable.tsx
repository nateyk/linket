import {ScheduleLogItem} from '@app/gen/schemas/schedule-log-item';
import {
  RerunButton,
  scheduleDatatableColumns,
} from '@common/admin/logging/schedule/schedule-datatable-columns';
import {listScheduleLogItemsOptions} from '@common/admin/logging/schedule/schedule-queries';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {BooleanIndicator} from '@common/datatable/column-templates/boolean-indicator';
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
import {ClockIcon, DownloadIcon} from 'lucide-react';
import {use} from 'react';

export function Component() {
  const {isMobileMode} = use(DashboardLayoutContext);
  const {
    queryState,
    setQueryState,
    deferredSearchParams,
    isFiltering,
    isLoading,
  } = useTableQueryState();

  const query = useSuspenseQuery(
    listScheduleLogItemsOptions(deferredSearchParams),
  );
  const items = query.data?.data ?? [];

  const table = useTable({
    data: items,
    columns: scheduleDatatableColumns,
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
          <DownloadScheduleLogButton className="ml-auto" />
        </DashboardLayout.SectionContentHeader>
        <DashboardLayout.SectionScrollContainer>
          {isMobileMode ? (
            <ScheduleLogMobileList items={items} />
          ) : (
            <GenericTable table={table} />
          )}
          {!items.length && <ScheduleLogEmptyState isFiltering={isFiltering} />}
          <TablePagination table={table} />
        </DashboardLayout.SectionScrollContainer>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function ScheduleLogMobileList({items}: {items: ScheduleLogItem[]}) {
  return (
    <Item.Group>
      {items.map(item => (
        <Item.Root key={item.id} variant="outline">
          <Item.Content>
            <Item.Title>{item.command}</Item.Title>
            {item.output ? (
              <Item.Description>{item.output}</Item.Description>
            ) : null}
            <Item.Row className="text-xs text-muted-foreground">
              <FormattedRelativeTime date={item.ran_at} />
              <span>&bull;</span>
              <span>{item.duration}ms</span>
              <BooleanIndicator value={item.exit_code === 0} />
            </Item.Row>
          </Item.Content>
          <Item.Actions>
            <RerunButton item={item} />
          </Item.Actions>
        </Item.Root>
      ))}
    </Item.Group>
  );
}

function DownloadScheduleLogButton({className}: {className?: string}) {
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
      href={`${base_url}/api/v1/logs/schedule/download`}
      download
    >
      <DownloadIcon />
      <Trans message="Download log" />
    </a>
  );
}

function ScheduleLogEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <ClockIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching scheduled commands" />
          ) : (
            <Trans message="No scheduled commands have ran yet" />
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

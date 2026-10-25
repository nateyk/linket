import {DomainCard} from '@app/dashboard/custom-domains/domain-card';
import {useDomainsDatatableFilters} from '@app/dashboard/custom-domains/domains-datatable-filters';
import {listDomainsOptions} from '@app/dashboard/custom-domains/domains-queries';
import {PermissionAwareButton} from '@app/dashboard/upgrade/permission-aware-button';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {AdHost} from '@common/admin/ads/ad-host';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {ConnectDomainDialog} from '@common/custom-domains/connect-domain-dialog/connect-domain-dialog';
import {AddFilterButton} from '@common/datatable/filters/add-filter-button';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Footer} from '@common/ui/footer/footer';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {Popover} from '@shadcn/popover/popover';
import {BackendPagination} from '@shadcn/table/utils/table-pagination';
import {TableSortButton} from '@shadcn/table/utils/table-sort-button';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {toast} from '@shadcn/toast/toast';
import {Toggle} from '@shadcn/toggle';
import {ToggleGroup} from '@shadcn/toggle-group/toggle-group';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {CircleQuestionMarkIcon, GlobeIcon, PlusIcon} from 'lucide-react';

const sortOptions = [
  {
    label: <Trans message="Date created" />,
    orderBy: 'created_at',
    isDefault: true,
  },
  {
    label: <Trans message="Last updated" />,
    orderBy: 'updated_at',
  },
  {
    label: <Trans message="Domain" />,
    orderBy: 'domain',
  },
];

export function Component() {
  const settings = useSettings();
  const {routeType} = useDatatableRouteType();
  const filters = useDomainsDatatableFilters();

  const {
    queryState,
    setQueryState,
    deferredSearchParams,
    isFiltering,
    isLoading,
  } = useTableQueryState({filters});

  const query = useSuspenseQuery(
    listDomainsOptions(routeType, deferredSearchParams),
  );
  const items = query.data?.data ?? [];

  useShowGlobalLoadingBar({isLoading});

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <h1>
            <Trans message="Branded domains" />
          </h1>
          <InfoTrigger />
        </DashboardLayout.SectionTitle>
        <ConnectDomainButton />
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent>
        <AdHost slot="dashboard" className="mb-6" />

        <DashboardLayout.SectionContentHeader>
          <AddFilterButton filters={filters} />
          <TableSortButton
            className="mr-auto"
            sortDescriptor={queryState.sort}
            onSortChange={sort => setQueryState({sort})}
            sortOptions={sortOptions}
          />
          <ToggleGroup
            variant="segmented"
            buttonVariant="ghost"
            value={[queryState.is_archived]}
            onValueChange={value => setQueryState({is_archived: value[0]})}
          >
            <Toggle value="false">
              <Trans message="Active" />
            </Toggle>
            <Toggle value="true">
              <Trans message="Archived" />
            </Toggle>
          </ToggleGroup>
        </DashboardLayout.SectionContentHeader>
        <FilterList filters={filters} />

        <DashboardLayout.SectionScrollContainer className="flex flex-col gap-4">
          {items.map(domain => (
            <DomainCard key={domain.id} domain={domain} />
          ))}
          <BackendPagination
            response={query.data}
            onPageChange={page => setQueryState({page})}
            onPageSizeChange={perPage => setQueryState({per_page: perPage})}
          />
          {items.length === 0 && <EmptyState isFiltering={isFiltering} />}
        </DashboardLayout.SectionScrollContainer>
        {settings.links?.dash_footer && <Footer padding="mt-11" />}
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function ConnectDomainButton() {
  const {routeType} = useDatatableRouteType();

  const handleSuccess = () => {
    toast.success(<Trans message="Domain connected" />);
  };

  return (
    <PermissionAwareButton resource="customDomain" action="create">
      <ConnectDomainDialog
        showGlobal={routeType === 'admin'}
        onSuccess={handleSuccess}
      >
        <Dialog.Trigger render={<Button variant="default" color="primary" />}>
          <PlusIcon data-icon="inline-start" />
          <Trans message="Connect domain" />
        </Dialog.Trigger>
      </ConnectDomainDialog>
    </PermissionAwareButton>
  );
}

function InfoTrigger() {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={<Button variant="ghost" size="icon-sm" />}
        className="-ml-1 text-muted-foreground"
        openOnHover
      >
        <CircleQuestionMarkIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <Trans message="Create trusted links with your own branded domains. Once connected, you can set the domain as default or only use it for specific links." />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function EmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <GlobeIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching domains" />
          ) : (
            <Trans message="No domains yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : (
            <Trans message="Get started by connecting your first domain." />
          )}
        </Empty.Description>
      </Empty.Header>
      {!isFiltering && (
        <Empty.Content>
          <ConnectDomainButton />
        </Empty.Content>
      )}
    </Empty.Root>
  );
}

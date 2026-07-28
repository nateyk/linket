import {DeleteLinkOverlaysDialog} from '@app/dashboard/link-overlays/link-overlays-datatable-page/delete-link-overlays-dialog';
import {LinkOverlayCard} from '@app/dashboard/link-overlays/link-overlays-datatable-page/link-overlay-card';
import {LinkOverlaysDatatableFilters} from '@app/dashboard/link-overlays/link-overlays-datatable-page/link-overlays-datatable-filters';
import {
  archiveLinkOverlaysOptions,
  listLinkOverlaysOptions,
  unarchiveLinkOverlaysOptions,
} from '@app/dashboard/link-overlays/link-overlays-queries';
import {PermissionAwareButton} from '@app/dashboard/upgrade/permission-aware-button';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {useUsage} from '@app/dashboard/use-usage';
import {AdHost} from '@common/admin/ads/ad-host';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {AddFilterPopover} from '@common/datatable/filters/add-filter-popover';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Footer} from '@common/ui/footer/footer';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {Popover} from '@shadcn/popover/popover';
import {BackendPagination} from '@shadcn/table/utils/table-pagination';
import {TableSortButton} from '@shadcn/table/utils/table-sort-button';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {Toggle} from '@shadcn/toggle';
import {ToggleGroup} from '@shadcn/toggle-group/toggle-group';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {toast} from '@ui/toast/toast';
import {
  CircleQuestionMarkIcon,
  PictureInPicture2,
  PlusIcon,
} from 'lucide-react';
import {useMemo, useState} from 'react';
import {Link} from 'react-router';

const sortOptions = [
  {
    label: <Trans message="Last updated" />,
    orderBy: 'updated_at',
  },
  {
    label: <Trans message="Date created" />,
    orderBy: 'created_at',
    isDefault: true,
  },
  {
    label: <Trans message="Name" />,
    orderBy: 'name',
  },
];

export function Component() {
  const {links} = useSettings();
  const {routeType, isForCurrentUser} = useDatatableRouteType();
  const filters = useMemo(() => {
    return !isForCurrentUser
      ? LinkOverlaysDatatableFilters
      : LinkOverlaysDatatableFilters.filter(filter => filter.key !== 'user_id');
  }, [isForCurrentUser]);

  const [selectedLinkOverlays, setSelectedLinkOverlays] = useState<number[]>(
    [],
  );

  const toggleLinkOverlay = (id: number) => {
    setSelectedLinkOverlays(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const {queryState, setQueryState, isFiltering, searchParams, isLoading} =
    useTableQueryState({filters});
  const isShowingArchived = queryState.is_archived === 'true';

  const query = useSuspenseQuery(
    listLinkOverlaysOptions(routeType, searchParams),
  );
  const items = query.data?.data ?? [];

  useShowGlobalLoadingBar({isLoading});

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Call-to-action overlays" />
          <InfoTrigger />
        </DashboardLayout.SectionTitle>
        <NewLinkOverlayButton />
      </DashboardLayout.SectionHeader>

      {selectedLinkOverlays.length > 0 ? (
        <SelectedActionsToolbar
          selectedLinkOverlays={selectedLinkOverlays}
          setSelectedLinkOverlays={setSelectedLinkOverlays}
          isShowingArchived={isShowingArchived}
          onSelectAll={
            items.length > selectedLinkOverlays.length
              ? () => setSelectedLinkOverlays(items.map(overlay => overlay.id))
              : undefined
          }
        />
      ) : null}

      <DashboardLayout.SectionContent>
        <AdHost slot="dashboard" className="mb-6" />

        <DashboardLayout.SectionContentHeader>
          <AddFilterPopover filters={filters} />
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

        <DashboardLayout.SectionScrollContainer className="space-y-4">
          {items.map(linkOverlay => (
            <LinkOverlayCard
              key={linkOverlay.id}
              linkOverlay={linkOverlay}
              isSelected={selectedLinkOverlays.includes(linkOverlay.id)}
              onToggle={() => toggleLinkOverlay(linkOverlay.id)}
            />
          ))}
          <BackendPagination
            response={query.data}
            onPageChange={page => setQueryState({page})}
            onPageSizeChange={perPage => setQueryState({per_page: perPage})}
          />
          {items.length === 0 && (
            <LinkOverlaysEmptyState isFiltering={isFiltering} />
          )}
        </DashboardLayout.SectionScrollContainer>

        {links?.dash_footer && <Footer padding="mt-11" />}
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

type SelectedActionsToolbarProps = {
  selectedLinkOverlays: number[];
  setSelectedLinkOverlays: (ids: number[]) => void;
  isShowingArchived: boolean;
  onSelectAll?: () => void;
};

function SelectedActionsToolbar({
  selectedLinkOverlays,
  setSelectedLinkOverlays,
  isShowingArchived,
  onSelectAll,
}: SelectedActionsToolbarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const query = useUsage();
  const canDeleteLinkOverlays = query.data?.data.link_overlays.delete;
  const archiveLinkOverlays = useMutation(archiveLinkOverlaysOptions());
  const unarchiveLinkOverlays = useMutation(unarchiveLinkOverlaysOptions());
  const isArchiveStatusChangePending =
    archiveLinkOverlays.isPending || unarchiveLinkOverlays.isPending;

  const handleArchive = () => {
    archiveLinkOverlays.mutate(selectedLinkOverlays, {
      onSuccess: () => {
        toast.positive(
          message(
            '[one Link overlay archived|other :count link overlays archived]',
            {values: {count: selectedLinkOverlays.length}},
          ),
        );
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  const handleUnarchive = () => {
    unarchiveLinkOverlays.mutate(selectedLinkOverlays, {
      onSuccess: () => {
        toast.positive(
          message(
            '[one Link overlay unarchived|other :count link overlays unarchived]',
            {values: {count: selectedLinkOverlays.length}},
          ),
        );
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <DashboardLayout.FloatingActions
      selectedItemsCount={selectedLinkOverlays.length}
      onClear={() => setSelectedLinkOverlays([])}
      onSelectAll={onSelectAll}
    >
      <Button
        variant="outline"
        color="default"
        disabled={!canDeleteLinkOverlays || isArchiveStatusChangePending}
        onClick={() =>
          isShowingArchived ? handleUnarchive() : handleArchive()
        }
      >
        {!isShowingArchived ? (
          <Trans message="Archive" />
        ) : (
          <Trans message="Unarchive" />
        )}
      </Button>
      <DeleteLinkOverlaysDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        ids={selectedLinkOverlays}
        onDelete={() => setSelectedLinkOverlays([])}
      >
        <Dialog.Trigger
          render={<Button color="danger" disabled={!canDeleteLinkOverlays} />}
        >
          <Trans message="Delete" />
        </Dialog.Trigger>
      </DeleteLinkOverlaysDialog>
    </DashboardLayout.FloatingActions>
  );
}

function NewLinkOverlayButton() {
  return (
    <PermissionAwareButton resource="linkOverlay" action="create">
      <Button color="primary" nativeButton={false} render={<Link to="new" />}>
        <PlusIcon data-icon="inline-start" />
        <Trans message="New overlay" />
      </Button>
    </PermissionAwareButton>
  );
}

function InfoTrigger() {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={<Button variant="ghost" size="icon-sm" />}
        className="text-muted-foreground"
        openOnHover
      >
        <CircleQuestionMarkIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <Trans message="Display fully customizable, non-intrusive overlay with a message and call-to-action button over destination website." />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function LinkOverlaysEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <PictureInPicture2 />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching overlays" />
          ) : (
            <Trans message="No overlays have been added yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : (
            <Trans message="Get started by creating a new call-to-action overlay." />
          )}
        </Empty.Description>
      </Empty.Header>
      {!isFiltering && (
        <Empty.Content>
          <NewLinkOverlayButton />
        </Empty.Content>
      )}
    </Empty.Root>
  );
}

import {DeleteLinkPagesDialog} from '@app/dashboard/link-pages/link-pages-datatable-page/delete-link-pages-dialog';
import {LinkPageCard} from '@app/dashboard/link-pages/link-pages-datatable-page/link-page-card';
import {
  archiveLinkPagesOptions,
  listLinkPagesOptions,
  unarchiveLinkPagesOptions,
} from '@app/dashboard/link-pages/link-pages-queries';
import {PermissionAwareButton} from '@app/dashboard/upgrade/permission-aware-button';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {useUsage} from '@app/dashboard/use-usage';
import {AdHost} from '@common/admin/ads/ad-host';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
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
import {CircleQuestionMarkIcon, FormIcon, PlusIcon} from 'lucide-react';
import {useState} from 'react';
import {Link} from 'react-router';

export function Component() {
  const {links} = useSettings();
  const {routeType} = useDatatableRouteType();

  const [selectedLinkPages, setSelectedLinkPages] = useState<number[]>([]);
  const toggleLinkPage = (id: number) => {
    setSelectedLinkPages(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id],
    );
  };

  const {queryState, setQueryState, isFiltering, searchParams, isLoading} =
    useTableQueryState();
  const isShowingArchived = queryState.is_archived === 'true';

  const query = useSuspenseQuery(listLinkPagesOptions(routeType, searchParams));
  const items = query.data?.data ?? [];

  useShowGlobalLoadingBar({isLoading});

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Link pages" />
          <InfoTrigger />
        </DashboardLayout.SectionTitle>
        <NewLinkPageButton />
      </DashboardLayout.SectionHeader>

      {selectedLinkPages.length > 0 ? (
        <SelectedActionsToolbar
          selectedLinkPages={selectedLinkPages}
          setSelectedLinkPages={setSelectedLinkPages}
          isShowingArchived={isShowingArchived}
          onSelectAll={
            items.length > selectedLinkPages.length
              ? () => setSelectedLinkPages(items.map(page => page.id))
              : undefined
          }
        />
      ) : null}

      <DashboardLayout.SectionContent>
        <AdHost slot="dashboard" className="mb-6" />

        <DashboardLayout.SectionContentHeader>
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

        <DashboardLayout.SectionScrollContainer className="flex flex-col gap-4">
          {items.map(linkPage => (
            <LinkPageCard
              key={linkPage.id}
              linkPage={linkPage}
              isSelected={selectedLinkPages.includes(linkPage.id)}
              onToggle={() => toggleLinkPage(linkPage.id)}
            />
          ))}
          <BackendPagination
            response={query.data}
            onPageChange={page => setQueryState({page})}
            onPageSizeChange={perPage => setQueryState({per_page: perPage})}
          />
          {items.length === 0 && (
            <LinkPagesEmptyState isFiltering={isFiltering} />
          )}
        </DashboardLayout.SectionScrollContainer>

        {links?.dash_footer && <Footer padding="mt-11" />}
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function LinkPagesEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <FormIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching link pages" />
          ) : (
            <Trans message="No link pages have been created yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : (
            <Trans message="Get started by creating your first link page." />
          )}
        </Empty.Description>
      </Empty.Header>
      {!isFiltering && (
        <Empty.Content>
          <NewLinkPageButton />
        </Empty.Content>
      )}
    </Empty.Root>
  );
}

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
    label: <Trans message="Title" />,
    orderBy: 'title',
  },
];

function NewLinkPageButton() {
  return (
    <PermissionAwareButton resource="linkPage" action="create">
      <Button color="primary" nativeButton={false} render={<Link to="new" />}>
        <PlusIcon data-icon="inline-start" />
        <Trans message="New page" />
      </Button>
    </PermissionAwareButton>
  );
}

type SelectedActionsToolbarProps = {
  selectedLinkPages: number[];
  setSelectedLinkPages: (ids: number[]) => void;
  isShowingArchived: boolean;
  onSelectAll?: () => void;
};

function SelectedActionsToolbar({
  selectedLinkPages,
  setSelectedLinkPages,
  isShowingArchived,
  onSelectAll,
}: SelectedActionsToolbarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const query = useUsage();
  const canDeleteLinkPages = query.data?.data.link_pages.delete;
  const archiveLinkPages = useMutation(archiveLinkPagesOptions());
  const unarchiveLinkPages = useMutation(unarchiveLinkPagesOptions());
  const isArchiveStatusChangePending =
    archiveLinkPages.isPending || unarchiveLinkPages.isPending;

  const handleArchive = () => {
    archiveLinkPages.mutate(selectedLinkPages, {
      onSuccess: () => {
        setSelectedLinkPages([]);
        toast.positive(
          message('[one Link page archived|other :count link pages archived]', {
            values: {count: selectedLinkPages.length},
          }),
        );
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  const handleUnarchive = () => {
    unarchiveLinkPages.mutate(selectedLinkPages, {
      onSuccess: () => {
        setSelectedLinkPages([]);
        toast.positive(
          message(
            '[one Link page unarchived|other :count link pages unarchived]',
            {values: {count: selectedLinkPages.length}},
          ),
        );
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <DashboardLayout.FloatingActions
      selectedItemsCount={selectedLinkPages.length}
      onClear={() => setSelectedLinkPages([])}
      onSelectAll={onSelectAll}
    >
      <Button
        variant="outline"
        color="default"
        disabled={!canDeleteLinkPages || isArchiveStatusChangePending}
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
      <DeleteLinkPagesDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        ids={selectedLinkPages}
        onDelete={() => setSelectedLinkPages([])}
      >
        <Dialog.Trigger
          render={<Button color="danger" disabled={!canDeleteLinkPages} />}
        >
          <Trans message="Delete" />
        </Dialog.Trigger>
      </DeleteLinkPagesDialog>
    </DashboardLayout.FloatingActions>
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
          <Trans message="Show a transitional page with fully custom markup. Users who visit the short url will briefly see the page before being redirected to destination url." />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

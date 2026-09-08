import {ChannelsDatatableColumns} from '@common/admin/channels/channels-datatable-columns';
import {ChannelsDocsLink} from '@common/admin/channels/channels-docs-link';
import {useApplyChannelPreset} from '@common/admin/channels/requests/use-apply-channel-preset';
import {channelQueries} from '@common/channels/channel-queries';
import {GlobalLoadingProgress} from '@common/core/global-loading-progress';
import {DataTableHeader} from '@common/datatable/data-table-header';
import {DataTablePaginationFooter} from '@common/datatable/data-table-pagination-footer';
import {useDatatableSearchParams} from '@common/datatable/filters/utils/use-datatable-search-params';
import {validateDatatableSearch} from '@common/datatable/filters/utils/validate-datatable-search';
import {Empty} from '@shadcn/empty/empty';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
const DashboardPage = {
  Root: DashboardLayout.MainSection,
  HeaderBar: DashboardLayout.SectionHeader,
  Body: DashboardLayout.SectionContent,
  ScrollContainer: DashboardLayout.SectionScrollContainer,
};
import {useDatatableQuery} from '@common/datatable/requests/use-datatable-query';
import {apiClient, queryClient} from '@common/http/query-client';
import {showHttpErrorToast} from '@common/http/show-http-error-toast';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {Table} from '@common/ui/tables/table';
import {useMutation} from '@tanstack/react-query';
import {Button} from '@ui/buttons/button';
import {Item} from '@ui/forms/listbox/item';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {KeyboardArrowDownIcon} from '@ui/icons/material/KeyboardArrowDown';
import {Menu, MenuTrigger} from '@ui/menu/menu-trigger';
import {ConfirmationDialog} from '@ui/overlays/dialog/confirmation-dialog';
import {useDialogContext} from '@ui/overlays/dialog/dialog-context';
import {DialogTrigger} from '@ui/overlays/dialog/dialog-trigger';
import {openDialog} from '@ui/overlays/store/dialog-store';
import {toast} from '@ui/toast/toast';
import {PlusIcon, RadioIcon} from 'lucide-react';
import {Fragment, useState} from 'react';
import {Link} from 'react-router';

interface ChannelPresetConfig {
  preset: string;
  name: string;
  description: string;
}

function AddNewChannelButton() {
  return (
    <Button
      variant="flat"
      color="primary"
      elementType={Link}
      to="new"
      startIcon={<PlusIcon />}
    >
      <Trans message="Add new channel" />
    </Button>
  );
}

function ChannelsEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <RadioIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching channels" />
          ) : (
            <Trans message="No channels have been created yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : (
            <Trans message="Get started by adding your first channel." />
          )}
        </Empty.Description>
      </Empty.Header>
      {!isFiltering && (
        <Empty.Content>
          <AddNewChannelButton />
        </Empty.Content>
      )}
    </Empty.Root>
  );
}

export function Component() {
  const [selectedIds, setSelectedIds] = useState<(number | string)[]>([]);
  const {
    searchParams,
    sortDescriptor,
    mergeIntoSearchParams,
    setSearchQuery,
    isFiltering,
  } = useDatatableSearchParams(validateDatatableSearch);

  const query = useDatatableQuery(channelQueries.index(searchParams));

  const selectedActions = (
    <DialogTrigger type="modal">
      <Button variant="flat" color="danger">
        <Trans message="Delete" />
      </Button>
      <DeleteChannelsDialog
        selectedIds={selectedIds}
        onDelete={() => setSelectedIds([])}
      />
    </DialogTrigger>
  );

  return (
    <DashboardPage.Root>
      <GlobalLoadingProgress query={query} />
      <StaticPageTitle>
        <Trans message="Channels" />
      </StaticPageTitle>
      <DashboardPage.HeaderBar
        title={<Trans message="Channels" />}
        rightContent={
          <>
            <ChannelsDocsLink variant="button" size="sm" />
            <AddNewChannelButton />
          </>
        }
        showSidebarToggleButton
      />
      <DashboardPage.Body>
        <DataTableHeader
          searchValue={searchParams.query}
          onSearchChange={setSearchQuery}
          actions={<Actions presets={query.data?.presets} />}
          selectedItems={selectedIds}
          selectedActions={selectedActions}
        />
        <DashboardPage.ScrollContainer>
          <Table
            cellHeight="h-13"
            columns={ChannelsDatatableColumns}
            data={query.items}
            sortDescriptor={sortDescriptor}
            onSortChange={mergeIntoSearchParams}
            enableSelection
            selectedRows={selectedIds}
            onSelectionChange={setSelectedIds}
          />
          {query.isEmpty && (
            <ChannelsEmptyState isFiltering={isFiltering} />
          )}
          <DataTablePaginationFooter
            query={query}
            onPageChange={page => mergeIntoSearchParams({page})}
            onPerPageChange={perPage => mergeIntoSearchParams({perPage})}
          />
        </DashboardPage.ScrollContainer>
      </DashboardPage.Body>
    </DashboardPage.Root>
  );
}

interface ActionsProps {
  presets: ChannelPresetConfig[] | undefined;
}
function Actions({presets}: ActionsProps) {
  return (
    <Fragment>
      <MenuTrigger
        onItemSelected={preset => openDialog(ApplyPresetDialog, {preset})}
      >
        <Button
          variant="outline"
          size="sm"
          endIcon={<KeyboardArrowDownIcon />}
          disabled={!presets?.length}
        >
          <Trans message="Apply preset" />
        </Button>
        <Menu>
          {presets?.map(preset => (
            <Item
              key={preset.preset}
              value={preset.preset}
              description={<Trans message={preset.description} />}
            >
              <Trans message={preset.name} />
            </Item>
          ))}
        </Menu>
      </MenuTrigger>
    </Fragment>
  );
}

interface ApplyPresetDialogProps {
  preset: string;
}
function ApplyPresetDialog({preset}: ApplyPresetDialogProps) {
  const {close} = useDialogContext();
  const resetChannels = useApplyChannelPreset();
  return (
    <ConfirmationDialog
      isLoading={resetChannels.isPending}
      onConfirm={() => {
        resetChannels.mutate({preset}, {onSuccess: () => close()});
      }}
      isDanger
      title={<Trans message="Apply preset" />}
      body={
        <Trans message="Are you sure you want to apply this channel preset? This will delete all current channels and leave only channels from the selected preset." />
      }
      confirm={<Trans message="Apply" />}
    />
  );
}

interface DeleteChannelsDialogProps {
  selectedIds: (number | string)[];
  onDelete: () => void;
}
function DeleteChannelsDialog({
  selectedIds,
  onDelete,
}: DeleteChannelsDialogProps) {
  const {close} = useDialogContext();
  const deleteSelectedChannels = useMutation({
    mutationFn: () => apiClient.delete(`channel/${selectedIds.join(',')}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['channels'],
      });
      toast(message('Channels deleted'));
      onDelete();
      close();
    },
    onError: err => showHttpErrorToast(err),
  });
  return (
    <ConfirmationDialog
      isDanger
      isLoading={deleteSelectedChannels.isPending}
      title={<Trans message="Delete channels" />}
      body={
        <Trans
          message="Are you sure you want to delete selected channels?"
          values={{count: selectedIds.length}}
        />
      }
      confirm={<Trans message="Delete" />}
      onConfirm={() => deleteSelectedChannels.mutate()}
    />
  );
}

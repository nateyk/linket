import {CreateQrCodeDialog} from '@app/dashboard/qr-codes/create-qr-code-dialog';
import {ArchiveQrCodesDialog} from '@app/dashboard/qr-codes/qr-codes-datatable-page/archive-qr-codes-dialog';
import {DeleteQrCodesDialog} from '@app/dashboard/qr-codes/qr-codes-datatable-page/delete-qr-codes-dialog';
import {QrCodeCard} from '@app/dashboard/qr-codes/qr-codes-datatable-page/qr-code-card';
import {QrCodesDatatableFilters} from '@app/dashboard/qr-codes/qr-codes-datatable-page/qr-codes-datatable-filters';
import {
  exportQrCodesCsvOptions,
  listQrCodesOptions,
} from '@app/dashboard/qr-codes/qr-codes-queries';
import {PermissionAwareButton} from '@app/dashboard/upgrade/permission-aware-button';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {QrCode} from '@app/gen/schemas/qr-code';
import {AdHost} from '@common/admin/ads/ad-host';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {CsvExportInfoDialog} from '@common/datatable/csv-export/csv-export-info-dialog';
import {AddFilterButton} from '@common/datatable/filters/add-filter-button';
import {FilterList} from '@common/datatable/filters/filter-list/filter-list';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Footer} from '@common/ui/footer/footer';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {BackendPagination} from '@shadcn/table/utils/table-pagination';
import {TableSortButton} from '@shadcn/table/utils/table-sort-button';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {downloadFileFromUrl} from '@ui/utils/files/download-file-from-url';
import {
  ArchiveIcon,
  DownloadIcon,
  PlusIcon,
  QrCodeIcon,
  TrashIcon,
} from 'lucide-react';
import {useMemo, useState} from 'react';

const sortOptions = [
  {
    label: <Trans message="Date created" />,
    orderBy: 'created_at',
    isDefault: true,
  },
  {
    label: <Trans message="Expiration date" />,
    orderBy: 'expires_at',
  },
  {
    label: <Trans message="Scans count" />,
    orderBy: 'scans_count',
  },
];

export function Component() {
  const {links} = useSettings();
  const {routeType, isForCurrentUser} = useDatatableRouteType();

  const filters = useMemo(() => {
    return !isForCurrentUser
      ? QrCodesDatatableFilters
      : QrCodesDatatableFilters.filter(filter => filter.key !== 'user_id');
  }, [isForCurrentUser]);

  const [selectedQrCodes, setSelectedQrCodes] = useState<QrCode[]>([]);
  const toggleQrCode = (qrCode: QrCode) => {
    setSelectedQrCodes(prev =>
      prev.some(item => item.id === qrCode.id)
        ? prev.filter(item => item.id !== qrCode.id)
        : [...prev, qrCode],
    );
  };

  const {queryState, setQueryState, isFiltering, searchParams, isLoading} =
    useTableQueryState({filters});

  const query = useSuspenseQuery(listQrCodesOptions(routeType, searchParams));
  const items = query.data?.data ?? [];

  useShowGlobalLoadingBar({isLoading});

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="QR codes" />
        </DashboardLayout.SectionTitle>
        <NewQrCodeButton />
      </DashboardLayout.SectionHeader>
      {selectedQrCodes.length > 0 ? (
        <SelectedActionsToolbar
          selectedQrCodes={selectedQrCodes}
          setSelectedQrCodes={setSelectedQrCodes}
          onSelectAll={
            items.length > selectedQrCodes.length
              ? () => setSelectedQrCodes(items)
              : undefined
          }
        />
      ) : null}
      <DashboardLayout.SectionContent>
        <AdHost slot="dashboard" className="mb-6" />
        <DashboardLayout.SectionContentHeader>
          <AddFilterButton filters={filters} color={null} />
          <TableSortButton
            className="mr-auto"
            sortDescriptor={queryState.sort}
            onSortChange={sort => setQueryState({sort})}
            sortOptions={sortOptions}
          />
          <ExportButton />
        </DashboardLayout.SectionContentHeader>
        <FilterList filters={filters} />
        <DashboardLayout.SectionScrollContainer className="flex flex-col gap-4">
          {items.map(qrCode => (
            <QrCodeCard
              key={qrCode.id}
              qrCode={qrCode}
              isSelected={selectedQrCodes.some(item => item.id === qrCode.id)}
              onToggle={() => toggleQrCode(qrCode)}
              onDelete={() => setSelectedQrCodes([])}
            />
          ))}
          <BackendPagination
            response={query.data}
            disabled={isLoading}
            onPageChange={page => setQueryState({page})}
          />
          {items.length === 0 ? (
            <QrCodesEmptyState isFiltering={isFiltering} />
          ) : null}
        </DashboardLayout.SectionScrollContainer>
        {links?.dash_footer && <Footer padding="mt-11" />}
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

type SelectedActionsToolbarProps = {
  selectedQrCodes: QrCode[];
  setSelectedQrCodes: (qrCodes: QrCode[]) => void;
  onSelectAll?: () => void;
};
function SelectedActionsToolbar({
  selectedQrCodes,
  setSelectedQrCodes,
  onSelectAll,
}: SelectedActionsToolbarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const unarchive = selectedQrCodes.every(qrCode => qrCode.deleted_at != null);

  return (
    <DashboardLayout.FloatingActions
      selectedItemsCount={selectedQrCodes.length}
      onClear={() => setSelectedQrCodes([])}
      onSelectAll={onSelectAll}
    >
      <ArchiveQrCodesDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        qrCodes={selectedQrCodes}
        unarchive={unarchive}
        onSuccess={() => setSelectedQrCodes([])}
      >
        <AlertDialog.Trigger render={<Button variant="outline" size="sm" />}>
          <ArchiveIcon />
          {unarchive ? (
            <Trans message="Unarchive" />
          ) : (
            <Trans message="Archive" />
          )}
        </AlertDialog.Trigger>
      </ArchiveQrCodesDialog>
      <DeleteQrCodesDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        qrCodeIds={selectedQrCodes.map(qrCode => qrCode.id)}
        onDelete={() => setSelectedQrCodes([])}
      >
        <AlertDialog.Trigger
          render={<Button variant="outline" color="danger" size="sm" />}
        >
          <TrashIcon />
          <Trans message="Delete" />
        </AlertDialog.Trigger>
      </DeleteQrCodesDialog>
    </DashboardLayout.FloatingActions>
  );
}

function ExportButton() {
  const [infoDialogOpen, setInfoDialogOpen] = useState(false);
  const {routeType} = useDatatableRouteType();
  const exportCsv = useMutation(
    exportQrCodesCsvOptions({type: routeType === 'admin' ? 'all' : 'current'}),
  );

  const handleCsvExport = () => {
    exportCsv.mutate(undefined, {
      onSuccess: response => {
        if (response.downloadPath) {
          downloadFileFromUrl(response.downloadPath);
        } else {
          setInfoDialogOpen(true);
        }
      },
    });
  };

  return (
    <>
      <Button variant="outline" onClick={handleCsvExport}>
        <DownloadIcon />
        <Trans message="Export" />
      </Button>
      <CsvExportInfoDialog
        open={infoDialogOpen}
        onOpenChange={setInfoDialogOpen}
      />
    </>
  );
}

function NewQrCodeButton() {
  return (
    <PermissionAwareButton resource="qrCode" action="create">
      <CreateQrCodeDialog>
        <Dialog.Trigger render={<Button variant="default" color="primary" />}>
          <PlusIcon />
          <Trans message="New QR code" />
        </Dialog.Trigger>
      </CreateQrCodeDialog>
    </PermissionAwareButton>
  );
}

function QrCodesEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <QrCodeIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching QR codes" />
          ) : (
            <Trans message="No QR codes yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : (
            <Trans message="Get started by creating a new QR code." />
          )}
        </Empty.Description>
      </Empty.Header>
      {!isFiltering && (
        <Empty.Content>
          <NewQrCodeButton />
        </Empty.Content>
      )}
    </Empty.Root>
  );
}

import {AdminDocsUrls} from '@app/admin/admin-config';
import {Localization} from '@app/gen/schemas/localization';
import {DocsLink} from '@common/admin/settings/layout/settings-links';
import {
  deleteLocalizationsOptions,
  listLocalizationsOptions,
  uploadLocalizationOptions,
} from '@common/admin/translations/localizations-queries';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Empty} from '@shadcn/empty/empty';
import {Item} from '@shadcn/item/item';
import {GenericTable} from '@shadcn/table/generic-table';
import {SortableHeader} from '@shadcn/table/utils/sortable-header';
import {TableSearchInput} from '@shadcn/table/utils/table-search-input';
import {useTable} from '@shadcn/table/utils/use-table';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {ColumnDef} from '@tanstack/react-table';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {DeleteIcon} from '@ui/icons/material/Delete';
import {TranslateIcon} from '@ui/icons/material/Translate';
import {downloadFileFromUrl} from '@ui/utils/files/download-file-from-url';
import {FileInputType} from '@ui/utils/files/file-input-config';
import {openUploadWindow} from '@ui/utils/files/open-upload-window';
import {UploadedFile} from '@ui/utils/files/uploaded-file';
import {
  DownloadIcon,
  EllipsisIcon,
  Globe2Icon,
  PencilIcon,
  PlusIcon,
  UploadIcon,
} from 'lucide-react';
import {use, useState} from 'react';
import {Link, useNavigate} from 'react-router';
import {CreateLocalizationDialog} from './create-localization-dialog';
import {UpdateLocalizationDialog} from './update-localization-dialog';

export const columns: ColumnDef<Localization>[] = [
  {
    id: 'name',
    accessorFn: locale => locale.name,
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Name" />
      </SortableHeader>
    ),
    cell: ({row}) => (
      <span>
        <span>{row.original.name}</span>{' '}
        <span className="uppercase">({row.original.language})</span>
      </span>
    ),
  },
  {
    id: 'direction',
    size: 1,
    accessorFn: locale => locale.direction,
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Direction" />
      </SortableHeader>
    ),
    cell: ({row}) => (
      <span className="uppercase">{row.original.direction}</span>
    ),
  },
  {
    id: 'created_at',
    size: 1,
    accessorKey: 'created_at',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Created at" />
      </SortableHeader>
    ),
    cell: ({row}) =>
      row.original.created_at ? (
        <time>
          <FormattedDate date={row.original.created_at} />
        </time>
      ) : null,
  },
  {
    id: 'actions',
    size: 1,
    header: () => (
      <span className="hidden">
        <Trans message="Actions" />
      </span>
    ),
    cell: ({row}) => <ActionsColumn locale={row.original} />,
  },
];

export function Component() {
  const navigate = useNavigate();
  const {isMobileMode} = use(DashboardLayoutContext);
  const {queryState, setQueryState, isFiltering} = useTableQueryState();

  const query = useSuspenseQuery(listLocalizationsOptions());
  const items = query.data.data;

  const table = useTable({
    data: items,
    columns,
    sort: queryState.sort,
    onSortChange: sort => setQueryState({sort}),
    isClientSide: true,
    globalFilter: queryState.query,
    pagination: {
      page: 1,
      per_page: Math.max(items.length, 1),
    },
  });

  const visibleLocalizations = table
    .getRowModel()
    .rows.map(row => row.original);
  const isEmpty = table.getRowCount() === 0;

  return (
    <DashboardLayout.MainSection>
      <StaticPageTitle>
        <Trans message="Localizations" />
      </StaticPageTitle>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <h1>
            <Trans message="Localizations" />
          </h1>
        </DashboardLayout.SectionTitle>
        <DocsLink
          variant="button"
          buttonVariant={isMobileMode ? 'icon' : 'text'}
          link={AdminDocsUrls.pages.translations}
        />
        <AddNewLocalizationButton />
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent>
        <DashboardLayout.SectionContentHeader>
          <TableSearchInput className="mr-auto" debounce={false} />
        </DashboardLayout.SectionContentHeader>
        <DashboardLayout.SectionScrollContainer>
          {isMobileMode ? (
            <LocalizationList localizations={visibleLocalizations} />
          ) : (
            (!isEmpty || isFiltering) && (
              <GenericTable
                table={table}
                onRowClick={row => navigate(`${row.original.id}/translate`)}
              />
            )
          )}
          {isEmpty ? (
            <LocalizationsEmptyState isFiltering={isFiltering} />
          ) : null}
        </DashboardLayout.SectionScrollContainer>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function LocalizationList({localizations}: {localizations: Localization[]}) {
  return (
    <Item.Group>
      {localizations.map(locale => (
        <Item.Root key={locale.id} variant="outline">
          <Item.Content>
            <Item.Title>
              <Link to={`${locale.id}/translate`}>{locale.name}</Link>
            </Item.Title>
            <Item.Description>
              <span className="uppercase">{locale.language}</span>
              {' • '}
              <span className="uppercase">{locale.direction}</span>
              {locale.created_at && (
                <>
                  {' • '}
                  <FormattedDate date={locale.created_at} />
                </>
              )}
            </Item.Description>
          </Item.Content>
          <Item.Actions className="shrink-0 md:ml-0">
            <ActionsColumn locale={locale} />
          </Item.Actions>
        </Item.Root>
      ))}
    </Item.Group>
  );
}

interface ActionsColumnProps {
  locale: Localization;
}
function ActionsColumn({locale}: ActionsColumnProps) {
  const uploadFile = useMutation(uploadLocalizationOptions(locale.id));
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  const handleUploadFile = (file: UploadedFile) => {
    uploadFile.mutate(
      {file: file.native},
      {
        onSuccess: () => {
          toast.success(<Trans message="Translation file uploaded" />);
        },
        onError: err => showHttpErrorToast(err),
      },
    );
  };

  return (
    <>
      {deleteDialogOpen && (
        <DeleteLocalizationDialog
          localizationId={locale.id}
          open
          onOpenChange={setDeleteDialogOpen}
        />
      )}
      {updateDialogOpen && (
        <UpdateLocalizationDialog
          localization={locale}
          open
          onOpenChange={setUpdateDialogOpen}
        />
      )}
      <Dropdown.Root>
        <Dropdown.Trigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={uploadFile.isPending}
            />
          }
        >
          <EllipsisIcon />
        </Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.LinkItem render={<Link to={`${locale.id}/translate`} />}>
            <TranslateIcon />
            <Trans message="Translate" />
          </Dropdown.LinkItem>
          <Dropdown.Item onClick={() => setUpdateDialogOpen(true)}>
            <PencilIcon />
            <Trans message="Update" />
          </Dropdown.Item>
          <Dropdown.Item
            onClick={() =>
              downloadFileFromUrl(`api/v1/localizations/${locale.id}/download`)
            }
          >
            <DownloadIcon />
            <Trans message="Download" />
          </Dropdown.Item>
          <Dropdown.Item
            onClick={async () => {
              const files = await openUploadWindow({
                types: [FileInputType.json],
              });
              const file = files[0];
              if (file) {
                handleUploadFile(file);
              }
            }}
          >
            <UploadIcon />
            <Trans message="Upload" />
          </Dropdown.Item>
          <Dropdown.Separator />
          <Dropdown.Item
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <DeleteIcon />
            <Trans message="Delete" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </>
  );
}

type DeleteLocalizationDialogProps = {
  localizationId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DeleteLocalizationDialog({
  localizationId,
  open,
  onOpenChange,
}: DeleteLocalizationDialogProps) {
  const deleteLocalization = useMutation(deleteLocalizationsOptions);

  const handleDelete = () => {
    deleteLocalization.mutate(localizationId, {
      onSuccess: () => {
        toast.success(<Trans message="Localization deleted" />);
        onOpenChange(false);
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Media>
              <Globe2Icon />
            </AlertDialog.Media>
            <AlertDialog.Title>
              <Trans message="Delete localization" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="Are you sure you want to delete this localization?" />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel disabled={deleteLocalization.isPending}>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={deleteLocalization.isPending}
              onClick={handleDelete}
            >
              <Trans message="Delete" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function AddNewLocalizationButton() {
  return (
    <CreateLocalizationDialog>
      <Dialog.Trigger render={<Button variant="default" color="primary" />}>
        <PlusIcon />
        <Trans message="New localization" />
      </Dialog.Trigger>
    </CreateLocalizationDialog>
  );
}

function LocalizationsEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <Globe2Icon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching localizations" />
          ) : (
            <Trans message="No localizations have been created yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : (
            <Trans message="Get started by adding your first localization." />
          )}
        </Empty.Description>
      </Empty.Header>
      {!isFiltering && (
        <Empty.Content>
          <AddNewLocalizationButton />
        </Empty.Content>
      )}
    </Empty.Root>
  );
}

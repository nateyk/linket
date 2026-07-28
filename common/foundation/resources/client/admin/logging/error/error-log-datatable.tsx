import {ErrorLogItem} from '@app/gen/schemas/error-log-item';
import {ListErrorLogItems200FilesItem} from '@app/gen/schemas/list-error-log-items200-files-item';
import {
  errorLogDatatableColumns,
  ErrorLogSeverity,
  ViewErrorButton,
} from '@common/admin/logging/error/error-log-datatable-columns';
import {
  deleteErrorLogFileOptions,
  listErrorLogItemsOptions,
} from '@common/admin/logging/error/error-log-queries';
import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button, buttonVariants} from '@shadcn/button/button';
import {Empty} from '@shadcn/empty/empty';
import {Select} from '@shadcn/forms/select/select';
import {Item} from '@shadcn/item/item';
import {GenericTable} from '@shadcn/table/generic-table';
import {TablePagination} from '@shadcn/table/utils/table-pagination';
import {TableSearchInput} from '@shadcn/table/utils/table-search-input';
import {useTable} from '@shadcn/table/utils/use-table';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {FormattedBytes} from '@ui/i18n/formatted-bytes';
import {FormattedRelativeTime} from '@ui/i18n/formatted-relative-time';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {cn} from '@ui/utils/cn';
import {BugIcon, DownloadIcon} from 'lucide-react';
import {parseAsString, ParserWithOptionalDefault} from 'nuqs';
import {Fragment, ReactNode, use, useEffect, useMemo, useState} from 'react';

export function Component() {
  const {isMobileMode} = use(DashboardLayoutContext);
  const [parsers, setParsers] = useState<
    Record<'file', ParserWithOptionalDefault<string>>
  >(() => ({
    file: parseAsString,
  }));
  const {
    queryState,
    setQueryState,
    deferredSearchParams,
    isFiltering,
    isLoading,
  } = useTableQueryState({parsers});
  const query = useSuspenseQuery(
    listErrorLogItemsOptions(deferredSearchParams),
  );
  const items = query.data.data ?? [];
  const files = query.data.files ?? [];
  const firstFile = files[0];

  // set default to first file after files are loaded, to avoid refetching initial file.
  useEffect(() => {
    if (firstFile && parsers.file.defaultValue !== firstFile.identifier) {
      setParsers({
        file: parseAsString.withDefault(firstFile.identifier),
      });
    }
  }, [firstFile, parsers.file.defaultValue]);

  const table = useTable({
    data: items,
    columns: errorLogDatatableColumns,
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

  const selectedFile = queryState.file || files[0]?.identifier;

  useShowGlobalLoadingBar({isLoading});

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionContent>
        <DashboardLayout.SectionContentHeader>
          <TableSearchInput />
          <ErrorLogActions
            className="ml-auto"
            files={files}
            selectedFile={selectedFile}
            onFileChange={identifier => {
              setQueryState({file: identifier}, {resetPage: true});
            }}
          />
        </DashboardLayout.SectionContentHeader>
        <DashboardLayout.SectionScrollContainer>
          {isMobileMode ? (
            <ErrorLogMobileList items={items} />
          ) : (
            <GenericTable table={table} />
          )}
          {!items.length && <ErrorLogEmptyState isFiltering={isFiltering} />}
          <TablePagination table={table} />
        </DashboardLayout.SectionScrollContainer>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function ErrorLogMobileList({items}: {items: ErrorLogItem[]}) {
  return (
    <Item.Group>
      {items.map(item => (
        <Item.Root key={item.id} variant="outline">
          <Item.Content>
            <Item.Title className="flex items-center gap-2">
              <ErrorLogSeverity level={item.level} />
              {item.datetime ? (
                <FormattedRelativeTime date={item.datetime} />
              ) : null}
            </Item.Title>
            <Item.Description>{item.message}</Item.Description>
          </Item.Content>
          <Item.Actions>
            <ViewErrorButton item={item} />
          </Item.Actions>
        </Item.Root>
      ))}
    </Item.Group>
  );
}

type ErrorLogActionsProps = {
  className?: string;
  files: ListErrorLogItems200FilesItem[];
  selectedFile: string | null;
  onFileChange: (identifier: string) => void;
};

function ErrorLogActions({
  className,
  files,
  selectedFile,
  onFileChange,
}: ErrorLogActionsProps) {
  const {base_url} = useSettings();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  if (!files.length) {
    return null;
  }

  const selectedFileData = files.find(file => file.identifier === selectedFile);

  return (
    <Fragment>
      <div className={cn('flex items-center gap-3', className)}>
        <ErrorLogFileSelector
          files={files}
          selectedFile={selectedFile}
          onFileChange={onFileChange}
        />

        <DeleteErrorLogDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          identifier={selectedFile}
        >
          <AlertDialog.Trigger
            render={
              <Button
                variant="outline"
                color="danger"
                disabled={!selectedFile}
              />
            }
          >
            <Trans message="Delete" />
          </AlertDialog.Trigger>
        </DeleteErrorLogDialog>

        {selectedFile && (
          <a
            className={cn(
              buttonVariants({
                variant: 'outline',
                color: 'default',
                size: 'default',
              }),
            )}
            href={`${base_url}/api/v1/logs/error/${selectedFile}/download`}
            download={selectedFileData?.name}
          >
            <DownloadIcon />
            <Trans message="Download log" />
          </a>
        )}
      </div>
    </Fragment>
  );
}

type ErrorLogFileSelectorProps = {
  files: ListErrorLogItems200FilesItem[];
  selectedFile: string | null;
  onFileChange: (identifier: string) => void;
};

function ErrorLogFileSelector({
  files,
  selectedFile,
  onFileChange,
}: ErrorLogFileSelectorProps) {
  const items = useMemo(() => {
    return files.map(file => ({
      label: (
        <span>
          {file.name} (<FormattedBytes bytes={file.size} />)
        </span>
      ),
      value: file.identifier,
    }));
  }, [files]);

  return (
    <Select.Root
      value={selectedFile}
      onValueChange={value => onFileChange(value as string)}
      items={items}
    >
      <Select.Trigger className="min-w-46">
        <Select.Value />
      </Select.Trigger>
      <Select.Content>
        {items.map(item => (
          <Select.Item key={item.value} value={item.value}>
            {item.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
}

type DeleteErrorLogDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  identifier: string | null;
  children: ReactNode;
};
function DeleteErrorLogDialog({
  open,
  onOpenChange,
  identifier,
  children,
}: DeleteErrorLogDialogProps) {
  const deleteLog = useMutation(deleteErrorLogFileOptions());

  const handleDelete = () => {
    if (!identifier) {
      return;
    }

    deleteLog.mutate(identifier, {
      onSuccess: () => {
        toast.success(<Trans message="Log file deleted" />);
        onOpenChange(false);
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Title>
              <Trans message="Delete log file" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="Are you sure you want to delete this log file?" />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel disabled={deleteLog.isPending}>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={deleteLog.isPending || !identifier}
              onClick={() => handleDelete()}
            >
              <Trans message="Delete" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function ErrorLogEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <BugIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching error log entries" />
          ) : (
            <Trans message="No errors have been logged yet" />
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

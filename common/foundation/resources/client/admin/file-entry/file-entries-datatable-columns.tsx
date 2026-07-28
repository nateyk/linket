import {FileEntry} from '@app/gen/schemas/file-entry';
import {BooleanIndicator} from '@common/datatable/column-templates/boolean-indicator';
import {FilePreviewDialog} from '@common/uploads/components/file-preview/file-preview-dialog';
import {FileTypeIcon} from '@common/uploads/components/file-type-icon/file-type-icon';
import {Avatar} from '@shadcn/avatar/avatar';
import {Button} from '@shadcn/button/button';
import {checkboxColumnDef} from '@shadcn/table/utils/checkbox-column-def';
import {SortableHeader} from '@shadcn/table/utils/sortable-header';
import {ColumnDef} from '@tanstack/react-table';
import {FormattedBytes} from '@ui/i18n/formatted-bytes';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {DialogTrigger} from '@ui/overlays/dialog/dialog-trigger';
import {EyeIcon} from 'lucide-react';

export const fileEntriesDatatableColumns: ColumnDef<FileEntry>[] = [
  checkboxColumnDef<FileEntry>(),
  {
    id: 'name',
    accessorKey: 'name',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Name" />
      </SortableHeader>
    ),
    cell: ({row}) => row.original.name,
  },
  {
    id: 'owner_id',
    enableSorting: true,
    size: 220,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Uploader" />
      </SortableHeader>
    ),
    cell: ({row}) => {
      const entry = row.original;
      const owner =
        entry.users?.find(user => user.owns_entry) ?? entry.users?.[0];
      if (!owner) {
        return null;
      }

      return (
        <div className="flex min-w-0 items-center gap-2">
          <Avatar.Root size="sm">
            <Avatar.Image
              src={owner.image ?? undefined}
              alt={owner.name ?? ''}
            />
            <Avatar.ColorFallback>
              {owner.name ?? owner.email}
            </Avatar.ColorFallback>
          </Avatar.Root>
          <div className="truncate">{owner.name ?? owner.email}</div>
        </div>
      );
    },
  },
  {
    id: 'type',
    accessorKey: 'type',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Type" />
      </SortableHeader>
    ),
    cell: ({row}) => {
      const entry = row.original;
      return entry.type ? (
        <div className="flex items-center gap-2">
          <FileTypeIcon type={entry.type} />
          <div className="capitalize">{entry.type}</div>
        </div>
      ) : null;
    },
  },
  {
    id: 'public',
    accessorKey: 'public',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Public" />
      </SortableHeader>
    ),
    cell: ({row}) => <BooleanIndicator value={!!row.original.public} />,
  },
  {
    id: 'file_size',
    accessorKey: 'file_size',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="File size" />
      </SortableHeader>
    ),
    cell: ({row}) => <FormattedBytes bytes={row.original.file_size} />,
  },
  {
    id: 'created_at',
    accessorKey: 'created_at',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Uploaded" />
      </SortableHeader>
    ),
    cell: ({row}) => (
      <time>
        <FormattedDate date={row.original.created_at} />
      </time>
    ),
  },
  {
    id: 'actions',
    size: 1,
    header: () => (
      <span className="sr-only">
        <Trans message="Actions" />
      </span>
    ),
    cell: ({row}) => <PreviewFileButton entry={row.original} />,
  },
];

export function PreviewFileButton({entry}: {entry: FileEntry}) {
  return (
    <div className="flex justify-end text-muted-foreground">
      <DialogTrigger type="modal">
        <Button variant="ghost" size="icon-sm">
          <EyeIcon />
        </Button>
        <FilePreviewDialog entries={[entry]} />
      </DialogTrigger>
    </div>
  );
}

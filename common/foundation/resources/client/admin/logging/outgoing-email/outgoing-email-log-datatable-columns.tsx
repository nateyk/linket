import {OutgoingEmailLogItem} from '@app/gen/schemas/outgoing-email-log-item';
import {OutgoingEmailLogEntryDialog} from '@common/admin/logging/outgoing-email/outgoing-email-log-entry-dialog';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {SortableHeader} from '@shadcn/table/utils/sortable-header';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {ColumnDef} from '@tanstack/react-table';
import {FormattedRelativeTime} from '@ui/i18n/formatted-relative-time';
import {Trans} from '@ui/i18n/trans';
import {EyeIcon} from 'lucide-react';

export const outgoingEmailDatatableColumns: ColumnDef<OutgoingEmailLogItem>[] =
  [
    {
      id: 'message_id',
      accessorKey: 'message_id',
      enableSorting: true,
      header: ({column}) => (
        <SortableHeader column={column}>
          <Trans message="Subject" />
        </SortableHeader>
      ),
      cell: ({row}) => {
        const item = row.original;
        return (
          <div className="min-w-0 overflow-hidden">
            <div className="truncate">{item.subject}</div>
            <div className="truncate text-xs text-muted-foreground">
              {item.message_id}
            </div>
          </div>
        );
      },
    },
    {
      id: 'status',
      accessorKey: 'status',
      enableSorting: true,
      header: ({column}) => (
        <SortableHeader column={column}>
          <Trans message="Status" />
        </SortableHeader>
      ),
      cell: ({row}) => <StatusBadge status={row.original.status} />,
    },
    {
      id: 'from',
      accessorKey: 'from',
      enableSorting: true,
      header: ({column}) => (
        <SortableHeader column={column}>
          <Trans message="From" />
        </SortableHeader>
      ),
      cell: ({row}) => row.original.from,
    },
    {
      id: 'to',
      accessorKey: 'to',
      enableSorting: true,
      header: ({column}) => (
        <SortableHeader column={column}>
          <Trans message="To" />
        </SortableHeader>
      ),
      cell: ({row}) => row.original.to,
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      enableSorting: true,
      header: ({column}) => (
        <SortableHeader column={column}>
          <Trans message="Date" />
        </SortableHeader>
      ),
      cell: ({row}) =>
        row.original.created_at ? (
          <FormattedRelativeTime date={row.original.created_at} />
        ) : null,
    },
    {
      id: 'actions',
      header: () => (
        <span className="sr-only">
          <Trans message="Actions" />
        </span>
      ),
      size: 1,
      cell: ({row}) => <PreviewEmailButton item={row.original} />,
    },
  ];

export function StatusBadge({status}: {status: string}) {
  switch (status) {
    case 'sent':
      return (
        <Badge variant="positive">
          <Trans message="Sent" />
        </Badge>
      );
    case 'not-sent':
      return (
        <Badge variant="secondary">
          <Trans message="Not sent" />
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive">
          <Trans message="Error" />
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export function PreviewEmailButton({item}: {item: OutgoingEmailLogItem}) {
  return (
    <OutgoingEmailLogEntryDialog logItemId={item.id}>
      <Tooltip.Root>
        <Dialog.Trigger
          render={
            <Tooltip.Trigger render={<Button variant="ghost" size="icon" />} />
          }
        >
          <EyeIcon />
        </Dialog.Trigger>
        <Tooltip.Content>
          <Trans message="Preview" />
        </Tooltip.Content>
      </Tooltip.Root>
    </OutgoingEmailLogEntryDialog>
  );
}

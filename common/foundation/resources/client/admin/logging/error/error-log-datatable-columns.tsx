import {ErrorLogItem} from '@app/gen/schemas/error-log-item';
import {ErrorLogEntryDialog} from '@common/admin/logging/error/error-log-entry-dialog';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {ColumnDef} from '@tanstack/react-table';
import {FormattedRelativeTime} from '@ui/i18n/formatted-relative-time';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {CircleAlertIcon, EyeIcon, InfoIcon} from 'lucide-react';

export const errorLogDatatableColumns: ColumnDef<ErrorLogItem>[] = [
  {
    id: 'message',
    accessorKey: 'message',
    header: () => <Trans message="Message" />,
    cell: ({row}) => (
      <div className="max-w-300 min-w-0 truncate overflow-hidden">
        {row.original.message}
      </div>
    ),
  },
  {
    id: 'datetime',
    accessorKey: 'datetime',
    header: () => <Trans message="Date" />,
    cell: ({row}) => <FormattedRelativeTime date={row.original.datetime} />,
  },
  {
    id: 'severity',
    accessorKey: 'level',
    header: () => <Trans message="Severity" />,
    cell: ({row}) => <ErrorLogSeverity level={row.original.level} />,
  },
  {
    id: 'actions',
    header: () => (
      <span className="sr-only">
        <Trans message="Actions" />
      </span>
    ),
    size: 1,
    cell: ({row}) => <ViewErrorButton item={row.original} />,
  },
];

export function ErrorLogSeverity({level}: {level: string}) {
  return (
    <span
      className={cn(
        'flex items-center gap-1.5 text-sm capitalize',
        level === 'error' ? 'text-destructive' : 'text-primary',
      )}
    >
      {level === 'error' ? (
        <CircleAlertIcon className="size-4" />
      ) : (
        <InfoIcon className="size-4" />
      )}
      {level}
    </span>
  );
}

export function ViewErrorButton({item}: {item: ErrorLogItem}) {
  return (
    <ErrorLogEntryDialog error={item}>
      <Tooltip.Root>
        <Dialog.Trigger
          render={
            <Tooltip.Trigger render={<Button variant="ghost" size="icon" />} />
          }
        >
          <EyeIcon />
        </Dialog.Trigger>
        <Tooltip.Content>
          <Trans message="View details" />
        </Tooltip.Content>
      </Tooltip.Root>
    </ErrorLogEntryDialog>
  );
}

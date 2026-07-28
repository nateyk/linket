import {ScheduleLogItem} from '@app/gen/schemas/schedule-log-item';
import {rerunScheduleLogOptions} from '@common/admin/logging/schedule/schedule-queries';
import {BooleanIndicator} from '@common/datatable/column-templates/boolean-indicator';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {Button} from '@shadcn/button/button';
import {SortableHeader} from '@shadcn/table/utils/sortable-header';
import {toast} from '@shadcn/toast/toast';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {useMutation} from '@tanstack/react-query';
import {ColumnDef} from '@tanstack/react-table';
import {FormattedRelativeTime} from '@ui/i18n/formatted-relative-time';
import {Trans} from '@ui/i18n/trans';
import {RepeatIcon} from 'lucide-react';

export const scheduleDatatableColumns: ColumnDef<ScheduleLogItem>[] = [
  {
    id: 'command',
    accessorKey: 'command',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Name" />
      </SortableHeader>
    ),
    cell: ({row}) => {
      const item = row.original;
      return (
        <div className="min-w-0 overflow-hidden">
          <div className="truncate">{item.command}</div>
          {item.output && (
            <div className="truncate text-xs text-muted-foreground">
              {item.output}
            </div>
          )}
        </div>
      );
    },
  },
  {
    id: 'ran_at',
    accessorKey: 'ran_at',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Last ran at" />
      </SortableHeader>
    ),
    cell: ({row}) => <FormattedRelativeTime date={row.original.ran_at} />,
  },
  {
    id: 'duration',
    accessorKey: 'duration',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Duration" />
      </SortableHeader>
    ),
    cell: ({row}) => `${row.original.duration}ms`,
  },
  {
    id: 'exit_code',
    accessorKey: 'exit_code',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Completed" />
      </SortableHeader>
    ),
    cell: ({row}) => <BooleanIndicator value={row.original.exit_code === 0} />,
  },
  {
    id: 'actions',
    header: () => (
      <span className="sr-only">
        <Trans message="Actions" />
      </span>
    ),
    size: 1,
    cell: ({row}) => <RerunButton item={row.original} />,
  },
];

export function RerunButton({item}: {item: ScheduleLogItem}) {
  const rerunCommand = useMutation(rerunScheduleLogOptions(item.id));

  const handleRerun = () => {
    rerunCommand.mutate(undefined, {
      onSuccess: () => {
        toast.success(<Trans message="Command reran" />);
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <Button
            variant="ghost"
            size="icon"
            disabled={rerunCommand.isPending}
            onClick={() => handleRerun()}
          />
        }
      >
        <RepeatIcon />
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Trans message="Rerun now" />
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

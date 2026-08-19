import {apiClient} from '@common/http/query-client';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {SortableHeader} from '@shadcn/table/utils/sortable-header';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {ColumnDef} from '@tanstack/react-table';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {formatMoney} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {EllipsisIcon, EyeIcon, TrashIcon} from 'lucide-react';
import {useState} from 'react';
import {Link} from 'react-router';
import {adminWithdrawalsBaseKey} from './admin-withdrawals-queries';

export type PayoutStatus =
  | 'requested'
  | 'processing'
  | 'paid'
  | 'rejected'
  | 'cancelled';

export type Payout = {
  id: number;
  amount_cents: number;
  currency: string;
  status: PayoutStatus;
  payout_method_label?: string | null;
  withdrawal_method_name?: string | null;
  created_at: string;
  creator?: {id: number; name: string; email: string};
};

const statusLabels: Record<PayoutStatus, string> = {
  requested: 'Requested',
  processing: 'Processing',
  paid: 'Paid',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const adminWithdrawalsColumns: ColumnDef<Payout>[] = [
  {
    id: 'id',
    accessorKey: 'id',
    enableSorting: true,
    size: 80,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="ID" />
      </SortableHeader>
    ),
    cell: ({row}) => `#${row.original.id}`,
  },
  {
    id: 'creator',
    size: 200,
    header: () => <Trans message="Creator" />,
    cell: ({row}) => {
      const creator = row.original.creator;
      return (
        <div className="min-w-0">
          <p className="truncate font-medium">{creator?.name ?? '—'}</p>
          <p className="truncate text-xs text-muted-foreground">
            {creator?.email}
          </p>
        </div>
      );
    },
  },
  {
    id: 'method',
    size: 180,
    header: () => <Trans message="Method" />,
    cell: ({row}) => (
      <span className="text-muted-foreground">
        {row.original.withdrawal_method_name ??
          row.original.payout_method_label ?? (
            <Trans message="Not specified" />
          )}
      </span>
    ),
  },
  {
    id: 'amount_cents',
    accessorKey: 'amount_cents',
    enableSorting: true,
    size: 120,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Amount" />
      </SortableHeader>
    ),
    cell: ({row}) => (
      <span className="font-semibold">
        {formatMoney(row.original.amount_cents, row.original.currency)}
      </span>
    ),
  },
  {
    id: 'status',
    size: 120,
    header: () => <Trans message="Status" />,
    cell: ({row}) => <WithdrawalStatusBadge status={row.original.status} />,
  },
  {
    id: 'created_at',
    accessorKey: 'created_at',
    enableSorting: true,
    size: 160,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Requested" />
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
      <span className="hidden">
        <Trans message="Actions" />
      </span>
    ),
    cell: ({row}) => <WithdrawalActionsButton payout={row.original} />,
  },
];

export function WithdrawalActionsButton({payout}: {payout: Payout}) {
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const deletePayout = useMutation({
    mutationFn: () =>
      apiClient.delete(`/api/v1/admin/withdrawals/${payout.id}`),
    onSuccess: () => {
      setDeleteDialogOpen(false);
      queryClient.invalidateQueries({queryKey: adminWithdrawalsBaseKey});
      toast.success(<Trans message="Withdrawal request deleted." />);
    },
    onError: error => showHttpErrorToast(error),
  });

  return (
    <>
      <div className="flex justify-end text-muted-foreground">
        <Dropdown.Root>
          <Dropdown.Trigger render={<Button variant="ghost" size="icon-sm" />}>
            <EllipsisIcon />
          </Dropdown.Trigger>
          <Dropdown.Content align="end">
            <Dropdown.Item
              render={
                <Link to={`/admin/withdrawals/${payout.id}/review`} />
              }
            >
              <EyeIcon />
              <Trans message="Review" />
            </Dropdown.Item>
            <Dropdown.Item
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <TrashIcon />
              <Trans message="Delete" />
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>
      </div>
      <AlertDialog.Root
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>
                <Trans message="Delete withdrawal request" />
              </AlertDialog.Title>
              <AlertDialog.Description>
                <Trans
                  message="Are you sure you want to delete withdrawal request #:id? This action cannot be undone."
                  values={{id: payout.id}}
                />
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>
                <Trans message="Cancel" />
              </AlertDialog.Cancel>
              <AlertDialog.Action
                color="danger"
                disabled={deletePayout.isPending}
                onClick={() => deletePayout.mutate()}
              >
                <Trans message="Delete" />
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}

function WithdrawalStatusBadge({status}: {status: PayoutStatus}) {
  const variants: Record<
    PayoutStatus,
    'outline' | 'positive' | 'destructive'
  > = {
    requested: 'outline',
    processing: 'outline',
    paid: 'positive',
    rejected: 'destructive',
    cancelled: 'destructive',
  };
  return (
    <Badge variant={variants[status]}>
      <Trans message={statusLabels[status]} />
    </Badge>
  );
}


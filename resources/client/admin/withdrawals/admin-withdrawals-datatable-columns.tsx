import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {SortableHeader} from '@shadcn/table/utils/sortable-header';
import {ColumnDef} from '@tanstack/react-table';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {formatMoney} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {EyeIcon} from 'lucide-react';
import {Link} from 'react-router';

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
  account_holder_snapshot?: string | null;
  bank_code_snapshot?: string | null;
  masked_destination?: string | null;
  payout_destination?: string | null;
  payout_method_label?: string | null;
  withdrawal_method_name?: string | null;
  created_at: string;
  creator?: {id: number; name: string; email: string};
  latest_payout_intent?: {status: string} | null;
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
    id: 'transfer_status',
    size: 145,
    header: () => <Trans message="Transfer" />,
    cell: ({row}) => (
      <TransferStatusBadge status={row.original.latest_payout_intent?.status} />
    ),
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
  return (
    <div className="flex justify-end">
      <Button
        variant="outline"
        size="xs"
        nativeButton={false}
        render={<Link to={`/admin/withdrawals/${payout.id}/review`} />}
      >
        <EyeIcon className="size-3.5" />
        <Trans message="Review" />
      </Button>
    </div>
  );
}

const transferLabels: Record<string, string> = {
  prepared: 'Prepared',
  submitted: 'Unconfirmed',
  provider_pending: 'Queued',
  requires_action: 'Needs action',
  successful: 'Settled',
  failed: 'Failed',
};

function TransferStatusBadge({status}: {status?: string}) {
  if (!status) {
    return <span className="text-xs text-muted-foreground"><Trans message="Not submitted" /></span>;
  }

  const variant = status === 'successful'
    ? 'positive'
    : status === 'failed'
      ? 'destructive'
      : 'outline';
  return (
    <Badge variant={variant}>
      <Trans message={transferLabels[status] ?? status.replaceAll('_', ' ')} />
    </Badge>
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


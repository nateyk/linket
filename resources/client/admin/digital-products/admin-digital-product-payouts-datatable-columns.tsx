import {apiClient} from '@common/http/query-client';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {ColumnDef} from '@tanstack/react-table';
import {Trans} from '@ui/i18n/trans';
import {
  CheckIcon,
  EllipsisIcon,
  EyeIcon,
  LandmarkIcon,
  SendIcon,
  XIcon,
} from 'lucide-react';
import {useState} from 'react';
import {adminDigitalProductPayoutsBaseKey} from './admin-digital-product-payouts-queries';

export type DigitalProductPayout = {
  id: number;
  amount_cents: number;
  currency: string;
  status: 'requested' | 'processing' | 'paid' | 'rejected' | 'cancelled';
  payout_method_label?: string | null;
  withdrawal_method_name?: string | null;
  transfer_reference?: string | null;
  admin_notes?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  creator?: {name: string; email: string};
  activities?: {
    id: number;
    action: string;
    note?: string | null;
    created_at: string;
    actor?: {name: string} | null;
  }[];
};

const statusLabels: Record<DigitalProductPayout['status'], string> = {
  requested: 'Requested',
  processing: 'Processing',
  paid: 'Paid',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const adminDigitalProductPayoutColumns: ColumnDef<DigitalProductPayout>[] =
  [
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
      size: 200,
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
      size: 120,
      header: () => <Trans message="Amount" />,
      cell: ({row}) => (
        <span className="text-end font-medium">
          {formatMoney(row.original.amount_cents, row.original.currency)}
        </span>
      ),
    },
    {
      id: 'status',
      size: 120,
      header: () => <Trans message="Status" />,
      cell: ({row}) => <PayoutStatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      size: 1,
      header: () => (
        <span className="hidden">
          <Trans message="Actions" />
        </span>
      ),
      cell: ({row}) => <PayoutActionsButton payout={row.original} />,
    },
  ];

type PayoutAction = 'processing' | 'reject' | 'paid';

export function PayoutActionsButton({
  payout,
}: {
  payout: DigitalProductPayout;
}) {
  const queryClient = useQueryClient();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [action, setAction] = useState<PayoutAction>();
  const [note, setNote] = useState('');
  const [reference, setReference] = useState('');
  const [destination, setDestination] = useState<string>();

  const invalidate = () =>
    queryClient.invalidateQueries({queryKey: adminDigitalProductPayoutsBaseKey});

  const resetConfirmation = () => {
    setAction(undefined);
    setNote('');
    setReference('');
    setDestination(undefined);
  };

  const startProcessing = useMutation({
    mutationFn: () =>
      apiClient.post(
        `/api/v1/admin/digital-products/payout-requests/${payout.id}/processing`,
        {note: note.trim() || undefined},
      ),
    onSuccess: () => {
      setReviewOpen(false);
      resetConfirmation();
      invalidate();
      toast.success(<Trans message="Payout processing started." />);
    },
    onError: error => showHttpErrorToast(error),
  });

  const markPaid = useMutation({
    mutationFn: () =>
      apiClient.post(
        `/api/v1/admin/digital-products/payout-requests/${payout.id}/mark-paid`,
        {
          transfer_reference: reference.trim(),
          note: note.trim() || undefined,
        },
      ),
    onSuccess: () => {
      setReviewOpen(false);
      resetConfirmation();
      invalidate();
      toast.success(<Trans message="Transfer recorded as paid." />);
    },
    onError: error => showHttpErrorToast(error),
  });

  const reject = useMutation({
    mutationFn: () =>
      apiClient.post(
        `/api/v1/admin/digital-products/payout-requests/${payout.id}/reject`,
        {reason: note.trim()},
      ),
    onSuccess: () => {
      setReviewOpen(false);
      resetConfirmation();
      invalidate();
      toast.success(<Trans message="Payout request rejected." />);
    },
    onError: error => showHttpErrorToast(error),
  });

  const revealDestination = useMutation({
    mutationFn: () =>
      apiClient
        .post(
          `/api/v1/admin/digital-products/payout-requests/${payout.id}/reveal-destination`,
        )
        .then(response => response.data.destination as string),
    onSuccess: destination => setDestination(destination),
    onError: error => showHttpErrorToast(error),
  });

  const confirmAction = () => {
    if (action === 'paid') {
      markPaid.mutate();
    } else if (action === 'reject') {
      reject.mutate();
    } else if (action === 'processing') {
      startProcessing.mutate();
    }
  };

  const isPending = startProcessing.isPending || markPaid.isPending || reject.isPending;

  return (
    <>
      <div className="flex justify-end text-muted-foreground">
        <Dropdown.Root>
          <Dropdown.Trigger render={<Button variant="ghost" size="icon-sm" />}>
            <EllipsisIcon />
          </Dropdown.Trigger>
          <Dropdown.Content align="end">
            <Dropdown.Item onClick={() => setReviewOpen(true)}>
              <EyeIcon />
              <Trans message="Review" />
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>
      </div>
      <Dialog.Root open={reviewOpen} onOpenChange={setReviewOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Content className="sm:max-w-lg">
            <Dialog.Header>
              <Dialog.Title>
                <LandmarkIcon />
                <Trans message="Payout request" />
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <div className="space-y-4">
                <div className="flex items-start justify-between rounded-input bg-muted p-3">
                  <div>
                    <p className="font-medium">{payout.creator?.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {payout.withdrawal_method_name ??
                        payout.payout_method_label}
                    </p>
                  </div>
                  <div className="text-end">
                    <p className="font-semibold">
                      {formatMoney(payout.amount_cents, payout.currency)}
                    </p>
                    <PayoutStatusBadge status={payout.status} />
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={revealDestination.isPending}
                  onClick={() => revealDestination.mutate()}
                >
                  {destination ? (
                    <Trans message="Destination revealed" />
                  ) : (
                    <>
                      <EyeIcon />
                      <Trans message="Reveal payout destination" />
                    </>
                  )}
                </Button>
                {destination && (
                  <div className="rounded-input border p-3 font-mono text-sm break-all">
                    {destination}
                  </div>
                )}
                <Activity items={payout.activities ?? []} />
                {payout.status === 'requested' && (
                  <Button
                    className="w-full"
                    onClick={() => setAction('processing')}
                  >
                    <SendIcon />
                    <Trans message="Start processing" />
                  </Button>
                )}
                {payout.status === 'processing' && (
                  <Button className="w-full" onClick={() => setAction('paid')}>
                    <CheckIcon />
                    <Trans message="Record transfer as paid" />
                  </Button>
                )}
                {['requested', 'processing'].includes(payout.status) && (
                  <Button
                    className="w-full"
                    color="danger"
                    variant="outline"
                    onClick={() => setAction('reject')}
                  >
                    <XIcon />
                    <Trans message="Reject and release funds" />
                  </Button>
                )}
              </div>
            </Dialog.Body>
            <Dialog.Footer variant="muted">
              <Dialog.CloseButton>
                <Trans message="Close" />
              </Dialog.CloseButton>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
      <Dialog.Root
        open={!!action}
        onOpenChange={open => !open && setAction(undefined)}
      >
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Content className="sm:max-w-md">
            <Dialog.Header>
              <Dialog.Title>
                <Trans
                  message={
                    action === 'paid'
                      ? 'Record completed transfer'
                      : action === 'reject'
                        ? 'Reject payout request'
                        : 'Start payout processing'
                  }
                />
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <div className="space-y-4">
                {action === 'paid' && (
                  <Field.Root>
                    <Field.Label>
                      <Trans message="Transfer reference" />
                    </Field.Label>
                    <Input
                      value={reference}
                      onChange={event => setReference(event.target.value)}
                      placeholder="Bank or payment reference…"
                    />
                  </Field.Root>
                )}
                <Field.Root>
                  <Field.Label>
                    <Trans
                      message={
                        action === 'reject'
                          ? 'Rejection reason'
                          : 'Internal note (optional)'
                      }
                    />
                  </Field.Label>
                  <Textarea
                    value={note}
                    onChange={event => setNote(event.target.value)}
                    rows={4}
                  />
                </Field.Root>
              </div>
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                variant="outline"
                onClick={() => setAction(undefined)}
                disabled={isPending}
              >
                <Trans message="Cancel" />
              </Button>
              <Button
                color={action === 'reject' ? 'danger' : undefined}
                disabled={
                  isPending ||
                  (action === 'paid' && !reference.trim()) ||
                  (action === 'reject' && !note.trim())
                }
                onClick={confirmAction}
              >
                <Trans message="Confirm" />
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

export function PayoutStatusBadge({
  status,
}: {
  status: DigitalProductPayout['status'];
}) {
  const variant =
    status === 'paid'
      ? 'positive'
      : status === 'rejected' || status === 'cancelled'
        ? 'destructive'
        : 'outline';
  return (
    <Badge variant={variant}>
      <Trans message={statusLabels[status]} />
    </Badge>
  );
}

function Activity({items}: {items: NonNullable<DigitalProductPayout['activities']>}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium">
        <Trans message="Activity" />
      </p>
      <div className="space-y-2 border-l pl-3">
        {items.length ? (
          items.map(item => (
            <div key={item.id}>
              <p className="text-sm">
                <Trans message={item.action} />
                {item.actor?.name ? ` · ${item.actor.name}` : ''}
              </p>
              {item.note && (
                <p className="text-xs text-muted-foreground">{item.note}</p>
              )}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            <Trans message="No activity yet." />
          </p>
        )}
      </div>
    </div>
  );
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {style: 'currency', currency}).format(
    cents / 100,
  );
}
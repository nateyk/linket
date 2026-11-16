import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Spinner} from '@shadcn/spinner/spinner';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {formatMoney} from '@ui/i18n/format-money';
import {
  ArrowLeftIcon,
  BanIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  SendIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Link, useParams} from 'react-router';

export type PayoutStatus =
  | 'requested'
  | 'processing'
  | 'paid'
  | 'rejected'
  | 'cancelled';

export type PayoutIntent = {
  id: number;
  merchant_reference: string;
  status: string;
  chapa_reference?: string | null;
  verified_at?: string | null;
  last_error?: string | null;
};

export type Payout = {
  id: number;
  amount_cents: number;
  currency: string;
  status: PayoutStatus;
  payout_method_label?: string | null;
  withdrawal_method_name?: string | null;
  payout_destination?: string | null;
  transfer_reference?: string | null;
  admin_notes?: string | null;
  rejection_reason?: string | null;
  created_at?: string;
  processed_at?: string | null;
  paid_at?: string | null;
  rejected_at?: string | null;
  cancelled_at?: string | null;
  creator?: {id: number; name: string; email: string};
  processor?: {id: number; name: string} | null;
  withdrawalMethod?: {
    id?: number;
    name?: string;
    code?: string;
    destination_label?: string | null;
    instructions?: string | null;
    minimum_amount_cents?: number | null;
    maximum_amount_cents?: number | null;
  } | null;
  payoutMethod?: {
    id?: number;
    type?: string;
    account_holder?: string | null;
    display_label?: string | null;
  } | null;
  latest_payout_intent?: PayoutIntent | null;
  activities?: {
    id: number;
    action: string;
    note?: string | null;
    created_at?: string;
    actor?: {name: string} | null;
  }[];
};

const statusLabels: Record<PayoutStatus, string> = {
  requested: 'Requested',
  processing: 'Processing',
  paid: 'Paid',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

function useAdminWithdrawalReview(withdrawalId?: string) {
  const [payout, setPayout] = useState<Payout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [rejectOpen, setRejectOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/v1/admin/withdrawals/${withdrawalId}/review`);
      setPayout(res.data.data);
    } catch {
      setError('Unable to load withdrawal request.');
    } finally {
      setLoading(false);
    }
  }, [withdrawalId]);

  useEffect(() => {
    void load();
  }, [load]);

  const mutate = async (fn: () => Promise<string>) => {
    setSaving(true);
    setError(undefined);
    setSuccess(undefined);
    try {
      const msg = await fn();
      setSuccess(msg);
      await load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = () =>
    mutate(async () => {
      await apiClient.post(`/api/v1/admin/withdrawals/${payout!.id}/review`, {status: 'processing'});
      return 'Withdrawal approved and moved to processing.';
    });

  const handleSubmitTransfer = () =>
    mutate(async () => {
      const res = await apiClient.post(`/api/v1/admin/withdrawals/${payout!.id}/submit-transfer`);
      return res.data.message || 'Payout transfer submitted to Chapa.';
    });

  const handleVerifySettlement = () =>
    mutate(async () => {
      const res = await apiClient.post(`/api/v1/admin/withdrawals/${payout!.id}/verify-settlement`);
      return res.data.message || 'Settlement verified successfully.';
    });

  const handleManualPaid = (ref: string, note?: string) =>
    mutate(async () => {
      await apiClient.post(`/api/v1/admin/withdrawals/${payout!.id}/review`, {
        status: 'paid',
        transfer_reference: ref,
        note,
      });
      return 'Withdrawal marked as paid.';
    });

  const handleRejectConfirm = (reason: string, note?: string) =>
    mutate(async () => {
      await apiClient.post(`/api/v1/admin/withdrawals/${payout!.id}/review`, {
        status: 'rejected',
        reason,
        note,
      });
      setRejectOpen(false);
      return 'Withdrawal request rejected.';
    });

  return {
    payout,
    loading,
    saving,
    error,
    success,
    rejectOpen,
    setRejectOpen,
    handleApprove,
    handleSubmitTransfer,
    handleVerifySettlement,
    handleManualPaid,
    handleRejectConfirm,
  };
}

export function Component() {
  const {withdrawalId} = useParams();
  const state = useAdminWithdrawalReview(withdrawalId);

  if (state.loading) {
    return (
      <DashboardLayout.MainSection>
        <div className="flex h-64 items-center justify-center">
          <Spinner className="size-8" />
        </div>
      </DashboardLayout.MainSection>
    );
  }

  if (!state.payout) return null;

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <div className="flex-1 min-w-0">
          <DashboardLayout.SectionTitle><Trans message="Withdrawal review" /></DashboardLayout.SectionTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <Trans message="Withdrawal request #:id" values={{id: state.payout.id}} />
          </p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link to="/admin/withdrawals" />}>
          <ArrowLeftIcon />
          <Trans message="Withdrawals" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl space-y-6 py-6">
          {state.error && (
            <div role="alert" className="flex items-center gap-2 rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <CircleAlertIcon className="size-4 shrink-0" />
              <span>{state.error}</span>
            </div>
          )}
          {state.success && (
            <div role="status" className="flex items-center gap-2 rounded-input border border-positive/40 bg-positive/5 p-3 text-sm text-positive">
              <CheckCircle2Icon className="size-4 shrink-0" />
              <span>{state.success}</span>
            </div>
          )}
          <WithdrawalDetailsCard payout={state.payout} />
          <WithdrawalWorkflowCard
            payout={state.payout}
            saving={state.saving}
            onApprove={() => void state.handleApprove()}
            onSubmitTransfer={() => void state.handleSubmitTransfer()}
            onVerifySettlement={() => void state.handleVerifySettlement()}
            onOpenReject={() => state.setRejectOpen(true)}
            onManualPaid={(ref, note) => void state.handleManualPaid(ref, note)}
          />
          {state.payout.activities && state.payout.activities.length > 0 && (
            <WithdrawalActivityCard activities={state.payout.activities} />
          )}
          <RejectWithdrawalDialog
            open={state.rejectOpen}
            onOpenChange={state.setRejectOpen}
            onConfirm={state.handleRejectConfirm}
            saving={state.saving}
          />
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function WithdrawalDetailsCard({payout}: {payout: Payout}) {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title><Trans message="Withdrawal details" /></Card.Title>
        <Card.Description><StatusBadge status={payout.status} /></Card.Description>
      </Card.Header>
      <Card.Content>
        <Table.Root>
          <Table.Body>
            <Table.Row>
              <Table.Cell className="w-48 text-muted-foreground"><Trans message="ID" /></Table.Cell>
              <Table.Cell className="font-mono">#{payout.id}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell className="text-muted-foreground"><Trans message="Creator" /></Table.Cell>
              <Table.Cell>
                {payout.creator?.name ?? '—'}
                {payout.creator?.email && (
                  <span className="ml-2 text-sm text-muted-foreground">({payout.creator.email})</span>
                )}
              </Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell className="text-muted-foreground"><Trans message="Amount" /></Table.Cell>
              <Table.Cell className="font-semibold">{formatMoney(payout.amount_cents, payout.currency)}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell className="text-muted-foreground"><Trans message="Withdrawal method" /></Table.Cell>
              <Table.Cell>
                {payout.withdrawal_method_name ?? payout.payout_method_label ?? <Trans message="Not specified" />}
              </Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell className="text-muted-foreground"><Trans message="Payout destination" /></Table.Cell>
              <Table.Cell className="font-mono text-sm break-all">{payout.payout_destination ?? '—'}</Table.Cell>
            </Table.Row>
            <Table.Row>
              <Table.Cell className="text-muted-foreground"><Trans message="Requested at" /></Table.Cell>
              <Table.Cell>{formatDate(payout.created_at)}</Table.Cell>
            </Table.Row>
            {payout.processed_at && (
              <Table.Row>
                <Table.Cell className="text-muted-foreground"><Trans message="Processed at" /></Table.Cell>
                <Table.Cell>{formatDate(payout.processed_at)}</Table.Cell>
              </Table.Row>
            )}
            {payout.paid_at && (
              <Table.Row>
                <Table.Cell className="text-muted-foreground"><Trans message="Paid at" /></Table.Cell>
                <Table.Cell>{formatDate(payout.paid_at)}</Table.Cell>
              </Table.Row>
            )}
            {payout.transfer_reference && (
              <Table.Row>
                <Table.Cell className="text-muted-foreground"><Trans message="Transfer reference" /></Table.Cell>
                <Table.Cell className="font-mono">{payout.transfer_reference}</Table.Cell>
              </Table.Row>
            )}
            {payout.rejection_reason && (
              <Table.Row>
                <Table.Cell className="text-muted-foreground"><Trans message="Rejection reason" /></Table.Cell>
                <Table.Cell className="text-destructive">{payout.rejection_reason}</Table.Cell>
              </Table.Row>
            )}
            {payout.latest_payout_intent && (
              <Table.Row>
                <Table.Cell className="text-muted-foreground"><Trans message="Chapa payout intent" /></Table.Cell>
                <Table.Cell className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{payout.latest_payout_intent.merchant_reference}</span>
                    <Badge variant={payout.latest_payout_intent.status === 'success' ? 'positive' : payout.latest_payout_intent.status === 'failed' ? 'destructive' : 'outline'}>
                      {payout.latest_payout_intent.status}
                    </Badge>
                  </div>
                  {payout.latest_payout_intent.chapa_reference && (
                    <p className="font-mono text-xs text-muted-foreground">Chapa ref: {payout.latest_payout_intent.chapa_reference}</p>
                  )}
                  {payout.latest_payout_intent.last_error && (
                    <p className="text-xs text-destructive">Error: {payout.latest_payout_intent.last_error}</p>
                  )}
                </Table.Cell>
              </Table.Row>
            )}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>
  );
}

function WithdrawalWorkflowCard({
  payout,
  saving,
  onApprove,
  onSubmitTransfer,
  onVerifySettlement,
  onOpenReject,
  onManualPaid,
}: {
  payout: Payout;
  saving: boolean;
  onApprove: () => void;
  onSubmitTransfer: () => void;
  onVerifySettlement: () => void;
  onOpenReject: () => void;
  onManualPaid: (ref: string, note?: string) => void;
}) {
  const isFinal = ['paid', 'rejected', 'cancelled'].includes(payout.status);

  if (isFinal) {
    return (
      <Card.Root>
        <Card.Header>
          <Card.Title><Trans message="Lifecycle status" /></Card.Title>
          <Card.Description>
            {payout.status === 'paid' && <Trans message="This withdrawal was settled and marked as paid." />}
            {payout.status === 'rejected' && <Trans message="This withdrawal was rejected and reserved funds returned to creator." />}
            {payout.status === 'cancelled' && <Trans message="This withdrawal was cancelled." />}
          </Card.Description>
        </Card.Header>
      </Card.Root>
    );
  }

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title><Trans message="3-Stage Settlement Operations" /></Card.Title>
        <Card.Description><Trans message="Approve request, submit automated disbursement via Chapa, and verify settlement." /></Card.Description>
      </Card.Header>
      <Card.Content className="space-y-5">
        <Stage1Section payout={payout} saving={saving} onApprove={onApprove} onOpenReject={onOpenReject} />
        <Stage2Section payout={payout} saving={saving} onSubmitTransfer={onSubmitTransfer} />
        <Stage3Section payout={payout} saving={saving} onVerifySettlement={onVerifySettlement} onManualPaid={onManualPaid} />
      </Card.Content>
    </Card.Root>
  );
}

function Stage1Section({
  payout,
  saving,
  onApprove,
  onOpenReject,
}: {
  payout: Payout;
  saving: boolean;
  onApprove: () => void;
  onOpenReject: () => void;
}) {
  return (
    <div className="rounded-input border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm"><Trans message="Stage 1: Approval & Reservation" /></p>
          <p className="text-xs text-muted-foreground"><Trans message="Funds were reserved when the seller requested withdrawal. Approval moves it into Processing." /></p>
        </div>
        {payout.status === 'processing' && <Badge variant="positive"><Trans message="Approved" /></Badge>}
      </div>
      {payout.status === 'requested' && (
        <div className="flex flex-wrap gap-2 pt-2">
          <Button color="primary" disabled={saving} onClick={onApprove}>
            <CheckCircle2Icon />
            <Trans message="Approve & start processing" />
          </Button>
          <Button color="danger" variant="outline" disabled={saving} onClick={onOpenReject}>
            <BanIcon />
            <Trans message="Reject request" />
          </Button>
        </div>
      )}
    </div>
  );
}

function Stage2Section({
  payout,
  saving,
  onSubmitTransfer,
}: {
  payout: Payout;
  saving: boolean;
  onSubmitTransfer: () => void;
}) {
  const intent = payout.latest_payout_intent;
  const isManual = payout.withdrawalMethod?.code === 'other';
  const intentLabel: Record<string, string> = {
    prepared: 'Prepared',
    submitted: 'Submission unconfirmed',
    provider_pending: 'Queued — awaiting settlement',
    successful: 'Settled',
    failed: 'Transfer failed',
  };

  return (
    <div className="rounded-input border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-sm"><Trans message="Stage 2: Submit Transfer (Chapa v1)" /></p>
          <p className="text-xs text-muted-foreground"><Trans message="Sends a transfer request through the Linket platform Chapa account." /></p>
        </div>
        {intent && (
          <Badge variant={intent.status === 'successful' ? 'positive' : 'outline'}>
            {intentLabel[intent.status] ?? intent.status.replaceAll('_', ' ')}
          </Badge>
        )}
      </div>
      {payout.status === 'processing' && !intent && !isManual && (
        <Button color="primary" disabled={saving} onClick={onSubmitTransfer}>
          <SendIcon />
          <Trans message="Submit transfer to Chapa" />
        </Button>
      )}
      {intent?.status === 'submitted' && (
        <p role="status" className="text-xs text-muted-foreground">
          <Trans message="Transfer outcome is uncertain. Do not resubmit; verify the existing Chapa reference." />
        </p>
      )}
      {intent?.status === 'submitted' && intent.last_error && (
        <p className="text-xs text-muted-foreground">{intent.last_error}</p>
      )}
    </div>
  );
}

function Stage3Section({
  payout,
  saving,
  onVerifySettlement,
  onManualPaid,
}: {
  payout: Payout;
  saving: boolean;
  onVerifySettlement: () => void;
  onManualPaid: (ref: string, note?: string) => void;
}) {
  const [manualRef, setManualRef] = useState('');
  const [manualNote, setManualNote] = useState('');
  const [showManual, setShowManual] = useState(false);
  const status = payout.latest_payout_intent?.status;
  const canVerify = payout.status === 'processing' &&
    (status === 'submitted' || status === 'provider_pending');
  const canSettleManually = payout.status === 'processing' &&
    payout.withdrawalMethod?.code === 'other' && !payout.latest_payout_intent;

  return (
    <div className="rounded-input border p-4 space-y-3">
      <div>
        <p className="font-semibold text-sm"><Trans message="Stage 3: Confirm Verified Settlement" /></p>
        <p className="text-xs text-muted-foreground"><Trans message="Only Chapa-confirmed settlement marks a wallet or bank payout paid." /></p>
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-2">
        {canVerify && (
          <Button color="primary" disabled={saving} onClick={onVerifySettlement}>
            <ShieldCheckIcon />
            <Trans message="Verify settlement with Chapa" />
          </Button>
        )}
        {canSettleManually && <Button variant="outline" onClick={() => setShowManual(!showManual)}>
          <Trans message="Record manual settlement" />
        </Button>}
      </div>

      {showManual && canSettleManually && (
        <div className="mt-4 rounded-input border border-muted bg-muted/20 p-4 space-y-3">
          <Field.Root>
            <Field.Label><Trans message="Manual transfer reference" /></Field.Label>
            <Input
              value={manualRef}
              onChange={e => setManualRef(e.target.value)}
              placeholder="e.g. CBE-TX-998811 or Telebirr receipt number"
              required
            />
          </Field.Root>
          <Field.Root>
            <Field.Label><Trans message="Internal note (optional)" /></Field.Label>
            <Input
              value={manualNote}
              onChange={e => setManualNote(e.target.value)}
              placeholder="Manual payout notes..."
            />
          </Field.Root>
          <Button
            color="primary"
            disabled={saving || !manualRef.trim()}
            onClick={() => onManualPaid(manualRef.trim(), manualNote.trim() || undefined)}
          >
            <Trans message="Confirm manual settlement" />
          </Button>
        </div>
      )}
    </div>
  );
}

function RejectWithdrawalDialog({
  open,
  onOpenChange,
  onConfirm,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string, note?: string) => Promise<void>;
  saving: boolean;
}) {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;
    await onConfirm(reason.trim(), note.trim() || undefined);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="gap-4 rounded-card-sm sm:max-w-md">
          <Dialog.Header>
            <Dialog.Title><Trans message="Reject withdrawal request" /></Dialog.Title>
            <Dialog.Description>
              <Trans message="The creator will be notified of this reason and reserved funds will be returned to their balance." />
            </Dialog.Description>
          </Dialog.Header>
          <form id="reject-withdrawal-form" onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field.Root>
              <Field.Label><Trans message="Rejection reason (shown to creator)" /></Field.Label>
              <Textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Reason for rejection..."
                rows={3}
                required
              />
            </Field.Root>
            <Field.Root>
              <Field.Label><Trans message="Internal admin note (optional)" /></Field.Label>
              <Textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Audit notes..."
                rows={2}
              />
            </Field.Root>
          </form>
          <Dialog.Footer className="mt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={() => onOpenChange(false)}>
              <Trans message="Cancel" />
            </Button>
            <Button
              type="submit"
              form="reject-withdrawal-form"
              color="danger"
              disabled={saving || !reason.trim()}
            >
              {saving ? <Trans message="Rejecting..." /> : <Trans message="Confirm rejection" />}
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function WithdrawalActivityCard({
  activities,
}: {
  activities: NonNullable<Payout['activities']>;
}) {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title><Trans message="Activity timeline" /></Card.Title>
      </Card.Header>
      <Card.Content>
        <div className="space-y-4 border-l pl-4">
          {activities.map(activity => (
            <div key={activity.id} className="relative">
              <div className="absolute top-1 -left-5 size-2 rounded-full bg-primary" />
              <p className="font-medium text-sm">
                <Trans message={activity.action} />
                {activity.actor?.name && (
                  <span className="ml-2 text-xs text-muted-foreground">· {activity.actor.name}</span>
                )}
              </p>
              {activity.note && (
                <p className="mt-0.5 text-xs text-muted-foreground">{activity.note}</p>
              )}
              <p className="text-[11px] text-muted-foreground mt-0.5">{formatDate(activity.created_at)}</p>
            </div>
          ))}
        </div>
      </Card.Content>
    </Card.Root>
  );
}

function StatusBadge({status}: {status: PayoutStatus}) {
  const color =
    status === 'paid'
      ? 'positive'
      : status === 'rejected' || status === 'cancelled'
        ? 'destructive'
        : 'outline';
  return (
    <Badge variant={color}>
      <Trans message={statusLabels[status]} />
    </Badge>
  );
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

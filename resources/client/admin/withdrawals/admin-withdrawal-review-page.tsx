import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {formatMoney} from '@ui/i18n/format-money';
import {ArrowLeftIcon} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Link, useParams} from 'react-router';

type PayoutStatus =
  | 'requested'
  | 'processing'
  | 'paid'
  | 'rejected'
  | 'cancelled';

type Payout = {
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

export function Component() {
  const {withdrawalId} = useParams();
  const [payout, setPayout] = useState<Payout | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const [action, setAction] = useState<PayoutStatus>();
  const [note, setNote] = useState('');
  const [reference, setReference] = useState('');
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/api/v1/admin/withdrawals/${withdrawalId}/review`,
      );
      setPayout(response.data.data);
    } catch {
      setError('Unable to load withdrawal request.');
    } finally {
      setLoading(false);
    }
  }, [withdrawalId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!payout || !action) return;
    if (action === 'paid' && !reference.trim()) {
      setError('Enter the completed transfer reference.');
      return;
    }
    if (action === 'rejected' && !reason.trim()) {
      setError('Enter a reason for rejecting this withdrawal.');
      return;
    }
    if (action === payout.status) {
      setError('The status is not changed.');
      return;
    }
    const body: Record<string, unknown> = {
      status: action,
      note: note.trim() || undefined,
    };
    if (action === 'paid') {
      body.transfer_reference = reference.trim();
    } else if (action === 'rejected') {
      body.reason = reason.trim();
    }
    setSaving(true);
    setError(undefined);
    try {
      await apiClient.post(
        `/api/v1/admin/withdrawals/${payout.id}/review`,
        body,
      );
      setAction(undefined);
      setNote('');
      setReference('');
      setReason('');
      await load();
    } catch (e: unknown) {
      const message =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (e as any)?.response?.data?.message;
      setError(message ?? 'Unable to update this withdrawal request.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout.MainSection>
        <div className="flex h-64 items-center justify-center">
          <div className="size-8 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </DashboardLayout.MainSection>
    );
  }

  if (!payout) return null;

  const isActionable = !['paid', 'rejected', 'cancelled'].includes(
    payout.status,
  );

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <div>
          <DashboardLayout.SectionTitle>
            <Trans message="Withdrawal review" />
          </DashboardLayout.SectionTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <Trans message="Withdrawal request #:id" values={{id: payout.id}} />
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/admin/withdrawals" />}
        >
          <ArrowLeftIcon />
          <Trans message="Withdrawals" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl py-6">
          {error && (
            <div className="mb-5 rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-6">
            <Card.Root>
              <Card.Header>
                <Card.Title>
                  <Trans message="Withdrawal details" />
                </Card.Title>
                <Card.Description>
                  <StatusBadge status={payout.status} />
                </Card.Description>
              </Card.Header>
              <Card.Content>
                <Table.Root>
                  <Table.Body>
                    <Table.Row>
                      <Table.Cell className="w-48 text-muted-foreground">
                        <Trans message="ID" />
                      </Table.Cell>
                      <Table.Cell className="font-mono">
                        #{payout.id}
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell className="text-muted-foreground">
                        <Trans message="Creator" />
                      </Table.Cell>
                      <Table.Cell>
                        {payout.creator?.name ?? '—'}
                        {payout.creator?.email && (
                          <span className="ml-2 text-sm text-muted-foreground">
                            ({payout.creator.email})
                          </span>
                        )}
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell className="text-muted-foreground">
                        <Trans message="Amount" />
                      </Table.Cell>
                      <Table.Cell className="font-semibold">
                        {formatMoney(payout.amount_cents, payout.currency)}
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell className="text-muted-foreground">
                        <Trans message="Withdrawal method" />
                      </Table.Cell>
                      <Table.Cell>
                        {payout.withdrawal_method_name ??
                          payout.payout_method_label ?? (
                            <Trans message="Not specified" />
                          )}
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell className="text-muted-foreground">
                        <Trans message="Payout destination" />
                      </Table.Cell>
                      <Table.Cell className="font-mono text-sm break-all">
                        {payout.payout_destination ?? '—'}
                      </Table.Cell>
                    </Table.Row>
                    <Table.Row>
                      <Table.Cell className="text-muted-foreground">
                        <Trans message="Requested at" />
                      </Table.Cell>
                      <Table.Cell>{formatDate(payout.created_at)}</Table.Cell>
                    </Table.Row>
                    {payout.processed_at && (
                      <Table.Row>
                        <Table.Cell className="text-muted-foreground">
                          <Trans message="Processed at" />
                        </Table.Cell>
                        <Table.Cell>
                          {formatDate(payout.processed_at)}
                        </Table.Cell>
                      </Table.Row>
                    )}
                    {payout.paid_at && (
                      <Table.Row>
                        <Table.Cell className="text-muted-foreground">
                          <Trans message="Paid at" />
                        </Table.Cell>
                        <Table.Cell>{formatDate(payout.paid_at)}</Table.Cell>
                      </Table.Row>
                    )}
                    {payout.rejected_at && (
                      <Table.Row>
                        <Table.Cell className="text-muted-foreground">
                          <Trans message="Rejected at" />
                        </Table.Cell>
                        <Table.Cell>
                          {formatDate(payout.rejected_at)}
                        </Table.Cell>
                      </Table.Row>
                    )}
                    {payout.cancelled_at && (
                      <Table.Row>
                        <Table.Cell className="text-muted-foreground">
                          <Trans message="Cancelled at" />
                        </Table.Cell>
                        <Table.Cell>
                          {formatDate(payout.cancelled_at)}
                        </Table.Cell>
                      </Table.Row>
                    )}
                    {payout.transfer_reference && (
                      <Table.Row>
                        <Table.Cell className="text-muted-foreground">
                          <Trans message="Transfer reference" />
                        </Table.Cell>
                        <Table.Cell className="font-mono">
                          {payout.transfer_reference}
                        </Table.Cell>
                      </Table.Row>
                    )}
                    {payout.rejection_reason && (
                      <Table.Row>
                        <Table.Cell className="text-muted-foreground">
                          <Trans message="Rejection reason" />
                        </Table.Cell>
                        <Table.Cell className="text-destructive">
                          {payout.rejection_reason}
                        </Table.Cell>
                      </Table.Row>
                    )}
                    {payout.admin_notes && (
                      <Table.Row>
                        <Table.Cell className="text-muted-foreground">
                          <Trans message="Admin notes" />
                        </Table.Cell>
                        <Table.Cell>{payout.admin_notes}</Table.Cell>
                      </Table.Row>
                    )}
                    {payout.withdrawalMethod?.instructions && (
                      <Table.Row>
                        <Table.Cell className="text-muted-foreground">
                          <Trans message="Instructions" />
                        </Table.Cell>
                        <Table.Cell className="whitespace-pre-wrap">
                          {payout.withdrawalMethod.instructions}
                        </Table.Cell>
                      </Table.Row>
                    )}
                  </Table.Body>
                </Table.Root>
              </Card.Content>
            </Card.Root>

            {payout.activities && payout.activities.length > 0 && (
              <Card.Root>
                <Card.Header>
                  <Card.Title>
                    <Trans message="Activity log" />
                  </Card.Title>
                </Card.Header>
                <Card.Content>
                  <div className="space-y-4 border-l pl-4">
                    {payout.activities.map(activity => (
                      <div key={activity.id} className="relative">
                        <div className="absolute top-1 -left-5 size-2 rounded-full bg-primary" />
                        <p className="font-medium">
                          <Trans message={activity.action} />
                          {activity.actor?.name && (
                            <span className="ml-2 text-sm text-muted-foreground">
                              · {activity.actor.name}
                            </span>
                          )}
                        </p>
                        {activity.note && (
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {activity.note}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          {formatDate(activity.created_at)}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card.Content>
              </Card.Root>
            )}

            {isActionable && (
              <Card.Root>
                <Card.Header>
                  <Card.Title>
                    <Trans message="Take action" />
                  </Card.Title>
                  <Card.Description>
                    <Trans message="Change the status of this withdrawal request." />
                  </Card.Description>
                </Card.Header>
                <Card.Content className="space-y-4">
                  <Field.Root>
                    <Field.Label>
                      <Trans message="Status" />
                    </Field.Label>
                    <Select.Root
                      value={action}
                      onValueChange={value => setAction(value ?? undefined)}
                    >
                      <Select.Trigger className="w-full">
                        <Select.Value
                          placeholder={<Trans message="Select a new status" />}
                        />
                      </Select.Trigger>
                      <Select.Content>
                        {(
                          [
                            'processing',
                            'paid',
                            'rejected',
                            'cancelled',
                          ] as PayoutStatus[]
                        )
                          .filter(status => status !== payout.status)
                          .map(status => (
                            <Select.Item key={status} value={status}>
                              <Trans message={statusLabels[status]} />
                            </Select.Item>
                          ))}
                      </Select.Content>
                    </Select.Root>
                    <Field.Description>
                      <Trans message="Changing to Processing reserves funds and notifies the creator." />
                    </Field.Description>
                  </Field.Root>

                  <Field.Root>
                    <Field.Label>
                      <Trans message="Admin note (optional)" />
                    </Field.Label>
                    <Textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      rows={3}
                      placeholder="Internal note for this action…"
                    />
                  </Field.Root>

                  {action === 'paid' && (
                    <Field.Root>
                      <Field.Label>
                        <Trans message="Transfer reference" />
                      </Field.Label>
                      <Input
                        value={reference}
                        onChange={e => setReference(e.target.value)}
                        placeholder="Bank or payment reference"
                        required
                      />
                    </Field.Root>
                  )}

                  {action === 'rejected' && (
                    <Field.Root>
                      <Field.Label>
                        <Trans message="Rejection reason" />
                      </Field.Label>
                      <Textarea
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        rows={3}
                        placeholder="Reason shown to the creator…"
                        required
                      />
                    </Field.Root>
                  )}

                  <div className="flex gap-2">
                    <Button
                      color="primary"
                      disabled={saving || !action}
                      onClick={() => void submit()}
                    >
                      {saving ? (
                        <Trans message="Saving…" />
                      ) : (
                        <Trans message="Update status" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={saving}
                      onClick={() => {
                        setAction(undefined);
                        setNote('');
                        setReference('');
                        setReason('');
                      }}
                    >
                      <Trans message="Reset" />
                    </Button>
                  </div>
                </Card.Content>
              </Card.Root>
            )}
          </div>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
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

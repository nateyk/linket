import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {
  ArrowLeftIcon,
  CheckIcon,
  EyeIcon,
  LandmarkIcon,
  SendIcon,
  XIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Link} from 'react-router';

type Payout = {
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

export function Component() {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [selected, setSelected] = useState<Payout>();
  const [action, setAction] = useState<'processing' | 'reject' | 'paid'>();
  const [note, setNote] = useState('');
  const [reference, setReference] = useState('');
  const [destination, setDestination] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(
        '/api/v1/admin/digital-products/payout-requests',
      );
      setPayouts(response.data.data ?? []);
    } catch {
      setError('Unable to load payout requests.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!selected || !action) return;
    if (action === 'paid' && !reference.trim()) {
      setError('Enter the completed transfer reference.');
      return;
    }
    if (action === 'reject' && !note.trim()) {
      setError('Enter a reason for rejecting this request.');
      return;
    }
    const path =
      action === 'processing'
        ? 'processing'
        : action === 'reject'
          ? 'reject'
          : 'mark-paid';
    const body =
      action === 'paid'
        ? {transfer_reference: reference.trim(), note: note.trim() || undefined}
        : action === 'reject'
          ? {reason: note.trim()}
          : {note: note.trim() || undefined};
    setSaving(true);
    setError(undefined);
    try {
      await apiClient.post(
        `/api/v1/admin/digital-products/payout-requests/${selected.id}/${path}`,
        body,
      );
      setAction(undefined);
      setNote('');
      setReference('');
      await load();
    } catch {
      setError('Unable to update this payout request.');
    } finally {
      setSaving(false);
    }
  };
  const revealDestination = async () => {
    if (!selected) return;
    try {
      const response = await apiClient.post(
        `/api/v1/admin/digital-products/payout-requests/${selected.id}/reveal-destination`,
        {},
      );
      setDestination(response.data.destination);
    } catch {
      setError('Unable to reveal this payout destination.');
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <div>
          <DashboardLayout.SectionTitle>
            <Trans message="Payouts" />
          </DashboardLayout.SectionTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <Trans message="Review manual Digital Product withdrawals and record completed transfers." />
          </p>
        </div>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/admin/digital-products" />}
        >
          <ArrowLeftIcon />
          <Trans message="Digital Products" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl py-6">
          {error && (
            <div className="mb-5 rounded-input border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Card.Root>
            <Card.Header>
              <Card.Title>
                <Trans message="Withdrawal queue" />
              </Card.Title>
              <Card.Description>
                <Trans message="Funds are reserved when requested. A transfer reference is required before marking payment complete." />
              </Card.Description>
            </Card.Header>
            <Card.Content className="overflow-x-auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>
                      <Trans message="Creator" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Method" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Amount" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Status" />
                    </Table.Head>
                    <Table.Head className="text-end">
                      <Trans message="Review" />
                    </Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {loading ? (
                    <Table.Row>
                      <Table.Cell
                        colSpan={5}
                        className="h-28 text-center text-muted-foreground"
                      >
                        <Trans message="Loading…" />
                      </Table.Cell>
                    </Table.Row>
                  ) : payouts.length ? (
                    payouts.map(payout => (
                      <Table.Row key={payout.id}>
                        <Table.Cell>
                          <p className="font-medium">{payout.creator?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {payout.creator?.email}
                          </p>
                        </Table.Cell>
                        <Table.Cell className="text-muted-foreground">
                          {payout.withdrawal_method_name ??
                            payout.payout_method_label ?? (
                              <Trans message="Not specified" />
                            )}
                        </Table.Cell>
                        <Table.Cell className="font-medium">
                          {formatMoney(payout.amount_cents, payout.currency)}
                        </Table.Cell>
                        <Table.Cell>
                          <Status payout={payout} />
                        </Table.Cell>
                        <Table.Cell className="text-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelected(payout);
                              setDestination(undefined);
                            }}
                          >
                            <EyeIcon />
                            <Trans message="Review" />
                          </Button>
                        </Table.Cell>
                      </Table.Row>
                    ))
                  ) : (
                    <Table.Row>
                      <Table.Cell
                        colSpan={5}
                        className="h-28 text-center text-muted-foreground"
                      >
                        <Trans message="No payout requests." />
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Root>
            </Card.Content>
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>
      <Dialog.Root
        open={!!selected}
        onOpenChange={open => !open && setSelected(undefined)}
      >
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
              {selected && (
                <div className="space-y-4">
                  <div className="flex items-start justify-between rounded-input bg-muted p-3">
                    <div>
                      <p className="font-medium">{selected.creator?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selected.withdrawal_method_name ??
                          selected.payout_method_label}
                      </p>
                    </div>
                    <div className="text-end">
                      <p className="font-semibold">
                        {formatMoney(selected.amount_cents, selected.currency)}
                      </p>
                      <Status payout={selected} />
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => void revealDestination()}
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
                  <Activity items={selected.activities ?? []} />
                  {selected.status === 'requested' && (
                    <Button
                      className="w-full"
                      onClick={() => setAction('processing')}
                    >
                      <SendIcon />
                      <Trans message="Start processing" />
                    </Button>
                  )}
                  {selected.status === 'processing' && (
                    <Button
                      className="w-full"
                      onClick={() => setAction('paid')}
                    >
                      <CheckIcon />
                      <Trans message="Record transfer as paid" />
                    </Button>
                  )}
                  {['requested', 'processing'].includes(selected.status) && (
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
              )}
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
                      placeholder="Bank or payment reference"
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
              <Button variant="outline" onClick={() => setAction(undefined)}>
                <Trans message="Cancel" />
              </Button>
              <Button
                color={action === 'reject' ? 'danger' : undefined}
                disabled={saving}
                onClick={() => void submit()}
              >
                <Trans message="Confirm" />
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </DashboardLayout.MainSection>
  );
}

function Status({payout}: {payout: Payout}) {
  const color =
    payout.status === 'paid'
      ? 'positive'
      : payout.status === 'rejected' || payout.status === 'cancelled'
        ? 'danger'
        : 'warning';
  const labels: Record<Payout['status'], string> = {
    requested: 'Requested',
    processing: 'Processing',
    paid: 'Paid',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  };
  return (
    <Badge color={color} variant="outline">
      <Trans message={labels[payout.status]} />
    </Badge>
  );
}
function Activity({items}: {items: NonNullable<Payout['activities']>}) {
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

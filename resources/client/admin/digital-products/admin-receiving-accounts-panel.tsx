import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {type ReactNode, useCallback, useEffect, useMemo, useState} from 'react';
import {Link} from 'react-router';
import {useDebounce} from 'use-debounce';
import {BankLogo} from './bank-logo';

type Summary = {pending: number; approved: number; rejected: number; suspended: number};

type ReceivingAccount = {
  id: number;
  creator_name?: string;
  creator_email?: string;
  creator_admin_url?: string | null;
  provider: string;
  provider_display_name: string;
  account_masked: string;
  account_number?: string;
  checkout_blockers?: string[];
  account_name: string;
  status: string;
  lifecycle_state: string;
  is_active: boolean;
  is_suspended: boolean;
  linket_approved: boolean;
  verify_et_registered: boolean;
  checkout_eligible: boolean;
  submitted_at?: string;
  reviewed_at?: string;
  reviewer_name?: string | null;
  rejection_reason?: string | null;
  suspension_reason?: string | null;
  has_proof?: boolean;
  pending_alias?: string | null;
  audits?: {id: number; action: string; note?: string | null; actor_name?: string | null; created_at: string; snapshot?: Record<string, unknown>}[];
};

function groupAccountsByCreator(accounts: ReceivingAccount[]) {
  const groups: {
    key: string;
    creator_name?: string;
    creator_email?: string;
    creator_admin_url?: string | null;
    accounts: ReceivingAccount[];
  }[] = [];
  const index = new Map<string, (typeof groups)[number]>();

  for (const account of accounts) {
    const key = account.creator_admin_url ?? account.creator_email ?? `account-${account.id}`;
    const existing = index.get(key);
    if (existing) {
      existing.accounts.push(account);
      continue;
    }
    const group = {
      key,
      creator_name: account.creator_name,
      creator_email: account.creator_email,
      creator_admin_url: account.creator_admin_url,
      accounts: [account],
    };
    index.set(key, group);
    groups.push(group);
  }

  return groups;
}

function sortLabel(sort: string) {
  switch (sort) {
    case 'created_at':
      return <Trans message="Oldest submitted" />;
    case '-verified_at':
      return <Trans message="Recently reviewed" />;
    case 'provider':
      return <Trans message="Provider A–Z" />;
    default:
      return <Trans message="Newest submitted" />;
  }
}

function lifecycleLabel(state: string) {
  switch (state) {
    case 'pending_ownership_review':
      return <Trans message="Pending ownership review" />;
    case 'pending_provider_registration':
      return <Trans message="Pending provider registration" />;
    case 'provider_registered':
      return <Trans message="Provider registered" />;
    case 'suspended':
      return <Trans message="Suspended" />;
    case 'rejected':
      return <Trans message="Rejected" />;
    default:
      return <Trans message="Active" />;
  }
}

function checkoutBlockerLabel(blocker: string) {
  switch (blocker) {
    case 'linket_approval':
      return <Trans message="Linket has not approved this account." />;
    case 'suspended':
      return <Trans message="This account is suspended." />;
    case 'verify_et':
      return <Trans message="Verify.et registration is not recorded." />;
    case 'creator_activation':
      return <Trans message="The creator has not activated this account." />;
    case 'bank_checkout':
      return <Trans message="Checkout is turned off for this bank in Payment Gateways." />;
    default:
      return blocker;
  }
}

function auditActionLabel(action: string) {
  switch (action) {
    case 'approved':
      return <Trans message="Approved by admin" />;
    case 'rejected':
      return <Trans message="Rejected by admin" />;
    case 'suspended':
      return <Trans message="Suspended by admin" />;
    case 'restored':
      return <Trans message="Restored by admin" />;
    case 'provider_registered':
      return <Trans message="Verify.et registration recorded" />;
    case 'resubmit_snapshot':
      return <Trans message="Creator resubmitted account" />;
    default:
      return action;
  }
}

export function AdminReceivingAccountsPanel({
  userId,
  syncUrl = true,
  embedded = false,
}: {
  userId?: number;
  syncUrl?: boolean;
  embedded?: boolean;
} = {}) {
  const [summary, setSummary] = useState<Summary>({pending: 0, approved: 0, rejected: 0, suspended: 0});
  const [accounts, setAccounts] = useState<ReceivingAccount[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [search, setSearch] = useState(() => embedded ? '' : (new URLSearchParams(window.location.search).get('search') ?? ''));
  const [debouncedSearch] = useDebounce(search, 300);
  const [provider, setProvider] = useState('');
  const [lifecycle, setLifecycle] = useState(() => embedded ? '' : (new URLSearchParams(window.location.search).get('lifecycle') ?? ''));
  const [status, setStatus] = useState('');
  const [submittedFrom, setSubmittedFrom] = useState('');
  const [submittedTo, setSubmittedTo] = useState('');
  const [sort, setSort] = useState('-created_at');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [selected, setSelected] = useState<ReceivingAccount | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reasonOpen, setReasonOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [pendingAction, setPendingAction] = useState<'reject' | 'suspend' | null>(null);
  const [confirmApprove, setConfirmApprove] = useState(false);

  useEffect(() => {
    if (!syncUrl || embedded) {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (debouncedSearch.trim()) {
      params.set('search', debouncedSearch.trim());
    } else {
      params.delete('search');
    }
    if (lifecycle) {
      params.set('lifecycle', lifecycle);
    } else {
      params.delete('lifecycle');
    }
    const next = `${window.location.pathname}${params.toString() ? `?${params}` : ''}`;
    window.history.replaceState({}, '', next);
  }, [debouncedSearch, embedded, lifecycle, syncUrl]);


  const providers = useMemo(
    () => [
      {code: 'cbe', label: 'CBE'},
      {code: 'telebirr', label: 'Telebirr'},
      {code: 'cbebirr', label: 'CBE Birr'},
      {code: 'boa', label: 'BOA'},
      {code: 'awash', label: 'Awash'},
      {code: 'dashen', label: 'Dashen'},
    ],
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/v1/admin/storefront/payment-methods', {
        params: {
          page,
          search: debouncedSearch.trim() || undefined,
          provider: provider || undefined,
          lifecycle: lifecycle || undefined,
          status: status || undefined,
          user_id: userId,
          submitted_from: submittedFrom || undefined,
          submitted_to: submittedTo || undefined,
          sort,
        },
      });
      setSummary(response.data.summary ?? {pending: 0, approved: 0, rejected: 0, suspended: 0});
      setAccounts(response.data.data?.data ?? []);
      setLastPage(response.data.data?.last_page ?? 1);
      setError(undefined);
    } catch (reason) {
      setAccounts([]);
      setError(getApiErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, lifecycle, page, provider, sort, status, submittedFrom, submittedTo, userId]);


  useEffect(() => {
    void load();
  }, [load]);

  const openDetail = async (account: ReceivingAccount) => {
    setSelected(account);
    setDetailLoading(true);
    try {
      const response = await apiClient.get('/api/v1/admin/storefront/payment-methods/' + account.id);
      setSelected(response.data.data);
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally {
      setDetailLoading(false);
    }
  };

  const runAction = async (account: ReceivingAccount, action: string, body?: Record<string, string>) => {
    setBusy(true);
    try {
      await apiClient.post('/api/v1/admin/storefront/payment-methods/' + account.id + '/' + action, body);
      await load();
      if (selected?.id === account.id) {
        const response = await apiClient.get('/api/v1/admin/storefront/payment-methods/' + account.id);
        setSelected(response.data.data);
      }
      setError(undefined);
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const submitReason = async () => {
    if (!selected || !pendingAction || reason.trim().length < 3) {
      return;
    }
    await runAction(selected, pendingAction, {reason: reason.trim()});
    setReasonOpen(false);
    setReason('');
    setPendingAction(null);
  };

  const summaryChip = (
    label: ReactNode,
    count: number,
    filter: {lifecycle?: string; status?: string},
  ) => {
    const active =
      (filter.lifecycle ? lifecycle === filter.lifecycle : !lifecycle) &&
      (filter.status ? status === filter.status : !status) &&
      (filter.lifecycle || filter.status);
    return (
      <Button
        key={`${filter.lifecycle ?? ''}-${filter.status ?? ''}`}
        variant={active ? 'default' : 'outline'}
        size="sm"
        onClick={() => {
          if (active) {
            setLifecycle('');
            setStatus('');
          } else {
            setLifecycle(filter.lifecycle ?? '');
            setStatus(filter.status ?? '');
          }
          setPage(1);
        }}
      >
        {label}: {count}
      </Button>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {!embedded && (
      <div className="flex flex-wrap gap-2">
        {summaryChip(<Trans message="Pending" />, summary.pending, {lifecycle: 'pending_ownership_review'})}
        {summaryChip(<Trans message="Approved" />, summary.approved, {status: 'approved'})}
        {summaryChip(<Trans message="Rejected" />, summary.rejected, {lifecycle: 'rejected'})}
        {summaryChip(<Trans message="Suspended" />, summary.suspended, {lifecycle: 'suspended'})}
        <Button
          variant={lifecycle === 'attention' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            setLifecycle(lifecycle === 'attention' ? '' : 'attention');
            setStatus('');
            setPage(1);
          }}
        >
          <Trans message="Needs attention" />
        </Button>
      </div>
      )}
      <Card.Root className={embedded ? 'bg-transparent py-0 shadow-none ring-0' : undefined}>
        {!embedded && (
        <Card.Header>
          <Card.Title><Trans message="Receiving accounts" /></Card.Title>
          <Card.Description><Trans message="Pending, approved, rejected, and suspended creator accounts. Open Review to approve, reject, suspend, restore, or record Verify.et registration." /></Card.Description>
        </Card.Header>
        )}
        <Card.Content className={embedded ? 'flex flex-col gap-3 px-0' : 'flex flex-col gap-4'}>
          {!embedded && (
          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder="Search creators or accounts" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} aria-label="Search" />
            <Select.Root value={provider} onValueChange={value => { setProvider(value ?? ''); setPage(1); }}>
              <Select.Trigger className="w-full"><Select.Value placeholder={<Trans message="All providers" />} /></Select.Trigger>
              <Select.Content>
                <Select.Item value=""><Trans message="All providers" /></Select.Item>
                {providers.map(item => (
                  <Select.Item key={item.code} value={item.code}>{item.label}</Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
            <Select.Root value={sort} onValueChange={value => setSort(value ?? '-created_at')}>
              <Select.Trigger className="w-full"><Select.Value placeholder={<Trans message="Sort" />}>{sortLabel(sort)}</Select.Value></Select.Trigger>
              <Select.Content>
                <Select.Item value="-created_at"><Trans message="Newest submitted" /></Select.Item>
                <Select.Item value="created_at"><Trans message="Oldest submitted" /></Select.Item>
                <Select.Item value="-verified_at"><Trans message="Recently reviewed" /></Select.Item>
                <Select.Item value="provider"><Trans message="Provider A–Z" /></Select.Item>
              </Select.Content>
            </Select.Root>
            <Input type="date" aria-label="Submitted from" value={submittedFrom} onChange={event => { setSubmittedFrom(event.target.value); setPage(1); }} />
            <Input type="date" aria-label="Submitted to" value={submittedTo} onChange={event => { setSubmittedTo(event.target.value); setPage(1); }} />
            <Button variant="outline" onClick={() => void load()} disabled={loading}><Trans message="Refresh" /></Button>
          </div>
          )}
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{embedded ? <Trans message="This creator has no receiving accounts." /> : <Trans message="No creator receiving accounts found." />}</p>
          ) : embedded ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3"><Trans message="Account" /></th>
                    <th className="py-2 pr-3"><Trans message="Status" /></th>
                    <th className="py-2 pr-3"><Trans message="Verify.et" /></th>
                    <th className="py-2 pr-3"><Trans message="Checkout" /></th>
                    <th className="py-2"><Trans message="Actions" /></th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map(account => (
                    <tr key={account.id} className="border-b border-border/60">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <BankLogo code={account.provider} name={account.provider_display_name} />
                          <div>
                            <p className="font-medium">{account.provider_display_name}</p>
                            <p className="text-muted-foreground">{account.account_name}</p>
                            <p className="font-mono text-xs text-muted-foreground">{account.account_masked}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3"><Badge variant={account.lifecycle_state === 'rejected' || account.is_suspended ? 'destructive' : account.lifecycle_state === 'active' ? 'positive' : 'secondary'}>{lifecycleLabel(account.lifecycle_state)}</Badge></td>
                      <td className="py-3 pr-3">{account.verify_et_registered ? <Trans message="Registered" /> : <Trans message="Not registered" />}</td>
                      <td className="py-3 pr-3">{account.checkout_eligible ? <Trans message="Eligible" /> : <Trans message="Unavailable" />}</td>
                      <td className="py-3">
                        <Button size="sm" variant="outline" onClick={() => void openDetail(account)}><Trans message="Review" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="border-b text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3"><Trans message="Creator" /></th>
                    <th className="py-2 pr-3"><Trans message="Receiving accounts" /></th>
                    <th className="py-2"><Trans message="Actions" /></th>
                  </tr>
                </thead>
                <tbody>
                  {groupAccountsByCreator(accounts).map(group => (
                    <tr key={group.key} className="border-b border-border/60 align-top">
                      <td className="py-3 pr-3">
                        <p className="font-medium">{group.creator_name}</p>
                        <p className="text-xs text-muted-foreground">{group.creator_email}</p>
                      </td>
                      <td className="py-3 pr-3">
                        <ul className="flex flex-col gap-3">
                          {group.accounts.map(account => (
                            <li key={account.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                              <div className="flex min-w-48 items-center gap-2">
                                <BankLogo code={account.provider} name={account.provider_display_name} />
                                <div>
                                  <p className="font-medium">{account.provider_display_name}</p>
                                  <p className="text-muted-foreground">{account.account_name}</p>
                                  <p className="font-mono text-xs text-muted-foreground">{account.account_masked}</p>
                                </div>
                              </div>
                              <Badge variant={account.lifecycle_state === 'rejected' || account.is_suspended ? 'destructive' : account.lifecycle_state === 'active' ? 'positive' : 'secondary'}>{lifecycleLabel(account.lifecycle_state)}</Badge>
                              <span className="text-muted-foreground">{account.verify_et_registered ? <Trans message="Registered" /> : <Trans message="Not registered" />}</span>
                              <span className="text-muted-foreground">{account.checkout_eligible ? <Trans message="Eligible" /> : <Trans message="Unavailable" />}</span>
                              <Button size="sm" variant="outline" onClick={() => void openDetail(account)}>
                                <Trans message="Review" />
                              </Button>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="py-3">
                        <Button size="sm" variant="outline" nativeButton={false} render={<Link to={group.creator_admin_url ?? '/admin/creators'} />}>
                          <Trans message="Open creator" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!embedded && (
          <div className="flex gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}><Trans message="Previous" /></Button>
            <Button variant="outline" disabled={page >= lastPage} onClick={() => setPage(page + 1)}><Trans message="Next" /></Button>
          </div>
          )}
        </Card.Content>
      </Card.Root>

      <Dialog.Root
        open={!!selected}
        disablePointerDismissal={busy || confirmApprove || reasonOpen}
        onOpenChange={open => {
          if (!open) {
            if (busy || confirmApprove || reasonOpen) {
              return;
            }
            setSelected(null);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Content
            className="max-h-[90vh] max-w-lg"
            finalFocus
            showCloseButton={!busy}
          >
            {selected && (
              <>
                <Dialog.Header>
                  <Dialog.Title><Trans message="Review receiving account" /></Dialog.Title>
                  <Dialog.Description>{selected.creator_name} · {selected.provider_display_name}</Dialog.Description>
                </Dialog.Header>
                <Dialog.Body className="flex flex-col gap-4 text-sm">
                  {detailLoading ? (
                    <div className="flex justify-center py-6"><Spinner /></div>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <BankLogo code={selected.provider} name={selected.provider_display_name} className="size-12" />
                        <div>
                          <p className="font-medium">{selected.account_name}</p>
                          <p className="font-mono text-muted-foreground">{selected.account_number ?? selected.account_masked}</p>
                          <p className="text-muted-foreground"><Trans message="Submitted :date" values={{date: selected.submitted_at ? new Date(selected.submitted_at).toLocaleString() : '—'}} /></p>
                          {selected.reviewed_at && (
                            <p className="text-muted-foreground">
                              <Trans
                                message="Reviewed :date by :reviewer"
                                values={{
                                  date: new Date(selected.reviewed_at).toLocaleString(),
                                  reviewer: selected.reviewer_name ?? '—',
                                }}
                              />
                            </p>
                          )}
                          {selected.creator_admin_url && (
                            <a className="text-primary underline" href={selected.creator_admin_url}>
                              <Trans message="Open creator profile" />
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={selected.linket_approved ? 'positive' : 'secondary'}>{selected.linket_approved ? <Trans message="Linket approved" /> : <Trans message="Not approved" />}</Badge>
                        <Badge variant={selected.verify_et_registered ? 'positive' : 'secondary'}>{selected.verify_et_registered ? <Trans message="Verify.et registered" /> : <Trans message="Not registered" />}</Badge>
                        <Badge variant={selected.is_active ? 'positive' : 'secondary'}>{selected.is_active ? <Trans message="Creator activated" /> : <Trans message="Not activated" />}</Badge>
                        <Badge variant={selected.checkout_eligible ? 'positive' : 'destructive'}>{selected.checkout_eligible ? <Trans message="Checkout eligible" /> : <Trans message="Checkout unavailable" />}</Badge>
                      </div>
                      {!selected.checkout_eligible && (selected.checkout_blockers ?? []).length > 0 && (
                        <ul className="flex flex-col gap-1 text-muted-foreground">
                          {selected.checkout_blockers?.map(blocker => (
                            <li key={blocker}>{checkoutBlockerLabel(blocker)}</li>
                          ))}
                        </ul>
                      )}
                      {selected.rejection_reason && <p className="text-destructive"><Trans message="Rejection reason: :reason" values={{reason: selected.rejection_reason}} /></p>}
                      {selected.suspension_reason && <p className="text-destructive"><Trans message="Suspension reason: :reason" values={{reason: selected.suspension_reason}} /></p>}
                      {!selected.has_proof && selected.status === 'pending' && (
                        <p role="status" className="text-warning"><Trans message="No ownership proof was uploaded with this account." /></p>
                      )}
                      {selected.has_proof && (
                        <a className="text-primary underline" href={'/api/v1/admin/storefront/payment-methods/' + selected.id + '/proof'} target="_blank" rel="noreferrer">
                          <Trans message="View ownership proof" />
                        </a>
                      )}
                      <div>
                        <p className="mb-2 font-medium"><Trans message="Audit history" /></p>
                        <ul className="flex max-h-40 flex-col gap-2 overflow-y-auto rounded-card-sm border border-border p-3">
                          {(selected.audits ?? []).length === 0 ? (
                            <li className="text-muted-foreground"><Trans message="No audit entries yet." /></li>
                          ) : (
                            selected.audits?.map(entry => (
                              <li key={entry.id}>
                                <p className="font-medium">{auditActionLabel(entry.action)}</p>
                                {entry.actor_name && <p className="text-muted-foreground"><Trans message="By :name" values={{name: entry.actor_name}} /></p>}
                                {entry.note && <p className="text-muted-foreground">{entry.note}</p>}
                                <p className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleString()}</p>
                              </li>
                            ))
                          )}
                        </ul>
                      </div>
                    </>
                  )}
                </Dialog.Body>
                {!detailLoading && (
                  <Dialog.Footer className="gap-2 sm:justify-start">
                    {selected.status === 'pending' && (
                      <>
                        <Button disabled={busy} onClick={() => setConfirmApprove(true)}><Trans message="Approve account" /></Button>
                        <Button disabled={busy} variant="outline" onClick={() => { setPendingAction('reject'); setReasonOpen(true); }}><Trans message="Reject" /></Button>
                      </>
                    )}
                    {selected.lifecycle_state === 'pending_provider_registration' && (
                      <Button disabled={busy} onClick={() => void runAction(selected, 'provider-registration')}><Trans message="Record Verify.et registration" /></Button>
                    )}
                    {selected.linket_approved && !selected.is_suspended && (
                      <Button disabled={busy} variant="outline" onClick={() => { setPendingAction('suspend'); setReasonOpen(true); }}><Trans message="Suspend account" /></Button>
                    )}
                    {selected.lifecycle_state === 'suspended' && (
                      <Button disabled={busy} variant="outline" onClick={() => void runAction(selected, 'restore')}><Trans message="Restore account" /></Button>
                    )}
                    {selected.pending_alias && (
                      <Button disabled={busy} variant="outline" onClick={() => void runAction(selected, 'approve-alias')}><Trans message="Approve alias" /></Button>
                    )}
                  </Dialog.Footer>
                )}
              </>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={confirmApprove}
        disablePointerDismissal={busy}
        onOpenChange={open => {
          if (!open && !busy) {
            setConfirmApprove(false);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Content showCloseButton={!busy}>
            <Dialog.Header>
              <Dialog.Title><Trans message="Approve this receiving account?" /></Dialog.Title>
              <Dialog.Description>
                <Trans message="Ownership is accepted by Linket. The account still needs Verify.et registration recorded and creator activation before checkout can use it." />
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer className="gap-2">
              <Button variant="outline" onClick={() => setConfirmApprove(false)} disabled={busy}><Trans message="Cancel" /></Button>
              <Button
                disabled={busy || !selected}
                onClick={() => {
                  if (!selected) return;
                  setConfirmApprove(false);
                  void runAction(selected, 'approve');
                }}
              >
                <Trans message="Approve account" />
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root
        open={reasonOpen}
        disablePointerDismissal={busy}
        onOpenChange={open => {
          if (!open && !busy) {
            setReasonOpen(false);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Content showCloseButton={!busy}>
            <Dialog.Header>
              <Dialog.Title>{pendingAction === 'suspend' ? <Trans message="Suspend account" /> : <Trans message="Reject account" />}</Dialog.Title>
              <Dialog.Description><Trans message="Provide a reason that will be stored in the audit log." /></Dialog.Description>
            </Dialog.Header>
            <Dialog.Body>
              <textarea className="min-h-24 w-full rounded-card-sm border border-border bg-background p-3 text-sm" value={reason} onChange={event => setReason(event.target.value)} aria-label="Reason" />
            </Dialog.Body>
            <Dialog.Footer className="gap-2">
              <Button variant="outline" onClick={() => setReasonOpen(false)} disabled={busy}><Trans message="Cancel" /></Button>
              <Button disabled={busy || reason.trim().length < 3} onClick={() => void submitReason()}><Trans message="Confirm" /></Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

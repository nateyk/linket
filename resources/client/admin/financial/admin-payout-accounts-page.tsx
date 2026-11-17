import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Input} from '@shadcn/forms/input/input';
import {Spinner} from '@shadcn/spinner/spinner';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {CheckIcon, RefreshCwIcon, XIcon} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';

type PayoutAccount = {
  id: number;
  account_holder: string;
  display_label?: string;
  masked_account_number?: string;
  bank_code?: string;
  status: string;
  creator?: {id: number; name: string; email: string};
};

type StatusFilter = 'all' | 'pending' | 'active' | 'rejected';

export function Component() {
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/v1/admin/financial/payout-accounts', {params: {page}});
      setAccounts(response.data.data ?? []);
      setLastPage(response.data.meta?.last_page ?? 1);
      setError(undefined);
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { void load(); }, [load]);

  const review = async (account: PayoutAccount, decision: 'approve' | 'reject') => {
    if (busyId !== null) return;
    setBusyId(account.id);
    try {
      await apiClient.post(
        '/api/v1/admin/financial/payout-accounts/' + account.id + '/review',
        {decision},
      );
      await load();
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally {
      setBusyId(null);
    }
  };

  const filtered = useMemo(() => accounts.filter(account => {
    const matchesStatus = filter === 'all' ||
      (filter === 'pending' ? !['active', 'rejected'].includes(account.status) : account.status === filter);
    const value = [account.creator?.name, account.creator?.email, account.account_holder,
      account.display_label, account.bank_code, account.masked_account_number]
      .filter(Boolean).join(' ').toLowerCase();
    return matchesStatus && value.includes(query.trim().toLowerCase());
  }), [accounts, filter, query]);

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle><Trans message="Payout accounts" /></DashboardLayout.SectionTitle>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5">
          <p className="text-sm text-muted-foreground">
            <Trans message="Review creator bank and mobile-wallet destinations before they can receive Chapa withdrawals. Edited accounts require approval again." />
          </p>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Card.Root>
            <Card.Header className="gap-3">
              <Card.Title><Trans message="Creator payout accounts" /></Card.Title>
              <Card.Description>
                <Trans message="Account approval and withdrawal approval are separate. Review the account holder and masked destination before approving." />
              </Card.Description>
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Input
                  className="min-w-44 flex-1"
                  aria-label="Search payout accounts"
                  placeholder="Search creator or account"
                  value={query}
                  onChange={event => { setQuery(event.target.value); setPage(1); }}
                />
                <div className="flex flex-wrap gap-1" role="group" aria-label="Filter account status">
                  {(['all', 'pending', 'active', 'rejected'] as const).map(status => (
                    <Button
                      key={status}
                      size="sm"
                      variant={filter === status ? 'default' : 'outline'}
                      onClick={() => { setFilter(status); setPage(1); }}
                    >
                      {status === 'all' ? <Trans message="All" /> :
                        status === 'pending' ? <Trans message="Pending" /> :
                        status === 'active' ? <Trans message="Approved" /> :
                        <Trans message="Rejected" />}
                    </Button>
                  ))}
                </div>
                <Button size="sm" variant="outline" disabled={loading} onClick={() => void load()}>
                  <RefreshCwIcon aria-hidden="true" /><Trans message="Refresh" />
                </Button>
              </div>
            </Card.Header>
            <Card.Content>
              {loading ? (
                <div className="flex justify-center py-10" role="status"><Spinner /></div>
              ) : (
                <div className="overflow-x-auto">
                  <Table.Root>
                    <Table.Header>
                      <Table.Row>
                        <Table.Head><Trans message="Creator" /></Table.Head>
                        <Table.Head><Trans message="Destination" /></Table.Head>
                        <Table.Head><Trans message="Status" /></Table.Head>
                        <Table.Head><Trans message="Actions" /></Table.Head>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {filtered.map(account => (
                        <Table.Row key={account.id}>
                          <Table.Cell>
                            <p className="font-medium">{account.creator?.name ?? account.account_holder}</p>
                            {account.creator?.email && <p className="text-xs text-muted-foreground">{account.creator.email}</p>}
                          </Table.Cell>
                          <Table.Cell>
                            <p className="font-medium">{account.display_label ?? account.bank_code ?? 'Account'}</p>
                            <p className="text-xs text-muted-foreground">{account.account_holder}</p>
                            <p className="font-mono text-xs text-muted-foreground">{account.masked_account_number ?? '••••'}</p>
                          </Table.Cell>
                          <Table.Cell>
                            <Badge variant={account.status === 'active' ? 'positive' : 'outline'}>
                              {account.status.replaceAll('_', ' ')}
                            </Badge>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="flex flex-wrap gap-2">
                              {account.status !== 'active' && (
                                <Button size="sm" disabled={busyId !== null} onClick={() => void review(account, 'approve')}>
                                  <CheckIcon aria-hidden="true" /><Trans message="Approve" />
                                </Button>
                              )}
                              {account.status !== 'rejected' && (
                                <Button size="sm" variant="outline" disabled={busyId !== null} onClick={() => void review(account, 'reject')}>
                                  <XIcon aria-hidden="true" /><Trans message="Reject" />
                                </Button>
                              )}
                            </div>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                      {filtered.length === 0 && (
                        <Table.Row>
                          <Table.Cell colSpan={4} className="py-8 text-center text-muted-foreground">
                            <Trans message="No seller payout accounts to review." />
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </Table.Body>
                  </Table.Root>
                  <div className="flex items-center justify-between gap-3 border-t pt-4 text-sm text-muted-foreground">
                    <span><Trans message="Page" /> {page} / {lastPage}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage(current => current - 1)}><Trans message="Previous" /></Button>
                      <Button size="sm" variant="outline" disabled={page >= lastPage || loading} onClick={() => setPage(current => current + 1)}><Trans message="Next" /></Button>
                    </div>
                  </div>
                </div>
              )}
            </Card.Content>
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

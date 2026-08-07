import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {
  BanknoteIcon,
  ArrowLeftIcon,
  EditIcon,
  PlusIcon,
  TrashIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Link} from 'react-router';

type WithdrawalMethod = {
  id: number;
  name: string;
  code: string;
  destination_label?: string | null;
  instructions?: string | null;
  minimum_amount_cents?: number | null;
  maximum_amount_cents?: number | null;
  is_active: boolean;
  position: number;
};

export function Component() {
  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [deleteTarget, setDeleteTarget] = useState<WithdrawalMethod>();
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(
        '/api/v1/admin/financial/withdrawal-methods',
      );
      setMethods(response.data.data ?? []);
    } catch {
      setError('Unable to load withdrawal methods.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const destroy = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiClient.delete(
        `/api/v1/admin/financial/withdrawal-methods/${deleteTarget.id}`,
      );
      setDeleteTarget(undefined);
      await load();
    } catch {
      setError('Unable to delete this withdrawal method.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <div>
          <DashboardLayout.SectionTitle>
            <Trans message="Withdrawal methods" />
          </DashboardLayout.SectionTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <Trans message="Configure the payout methods creators can withdraw to." />
          </p>
        </div>
        <Button variant="outline" render={<Link to="/admin/withdrawals" />}>
          <ArrowLeftIcon />
          <Trans message="Withdrawals" />
        </Button>
        <Button color="primary" render={<Link to="/admin/financial/withdrawal-methods/create" />}>
          <PlusIcon />
          <Trans message="New method" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl py-6">
          {error && (
            <div className="mb-5 rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Card.Root>
            <Card.Header>
              <Card.Title>
                <Trans message="Payout methods" />
              </Card.Title>
              <Card.Description>
                <Trans message="These methods are shown to creators when requesting a withdrawal." />
              </Card.Description>
            </Card.Header>
            <Card.Content className="overflow-x-auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>
                      <Trans message="Method" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Destination label" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Range" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Status" />
                    </Table.Head>
                    <Table.Head className="text-end">
                      <Trans message="Actions" />
                    </Table.Head>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {loading ? (
                    <Table.Row>
                      <Table.Cell colSpan={5} className="h-28 text-center text-muted-foreground">
                        <Trans message="Loading…" />
                      </Table.Cell>
                    </Table.Row>
                  ) : methods.length ? (
                    methods.map(method => (
                      <Table.Row key={method.id}>
                        <Table.Cell>
                          <div className="flex items-center gap-3">
                            <div className="flex size-9 items-center justify-center rounded-full bg-muted">
                              <BanknoteIcon className="size-4" />
                            </div>
                            <div>
                              <p className="font-medium">{method.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {method.code}
                              </p>
                            </div>
                          </div>
                        </Table.Cell>
                        <Table.Cell className="text-muted-foreground">
                          {method.destination_label ?? '—'}
                        </Table.Cell>
                        <Table.Cell className="text-muted-foreground">
                          {formatRange(method)}
                        </Table.Cell>
                        <Table.Cell>
                          {method.is_active ? (
                            <Badge variant="positive">
                              <Trans message="Active" />
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Trans message="Inactive" />
                            </Badge>
                          )}
                        </Table.Cell>
                        <Table.Cell className="text-end">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon-sm"
                              variant="outline"
                              color="primary"
                              render={
                                <Link
                                  to={`/admin/financial/withdrawal-methods/${method.id}/edit`}
                                />
                              }
                            >
                              <EditIcon />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="outline"
                              color="danger"
                              onClick={() => setDeleteTarget(method)}
                            >
                              <TrashIcon />
                            </Button>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))
                  ) : (
                    <Table.Row>
                      <Table.Cell colSpan={5} className="h-28 text-center text-muted-foreground">
                        <Trans message="No withdrawal methods found." />
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Root>
            </Card.Content>
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>

      <Dialog.Root open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(undefined)}>
        <Dialog.Content className="sm:max-w-md">
          <Dialog.Header>
            <Dialog.Title>
              <Trans message="Delete withdrawal method" />
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Trans
              message="Are you sure you want to delete the “:name” withdrawal method? Creators with pending requests using it will be affected."
              values={{name: deleteTarget?.name ?? ''}}
            />
          </Dialog.Body>
          <Dialog.Footer>
            <Button variant="outline" onClick={() => setDeleteTarget(undefined)} disabled={deleting}>
              <Trans message="Cancel" />
            </Button>
            <Button color="danger" onClick={() => void destroy()} disabled={deleting}>
              <TrashIcon />
              <Trans message="Delete" />
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Root>
    </DashboardLayout.MainSection>
  );
}

function formatRange(method: WithdrawalMethod) {
  const min = method.minimum_amount_cents ?? 0;
  const max = method.maximum_amount_cents;
  const range = `${formatMoney(min)} – ${max != null ? formatMoney(max) : '∞'}`;
  return max != null || min > 0 ? range : '—';
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat(undefined, {style: 'currency', currency: 'USD'}).format(
    cents / 100,
  );
}

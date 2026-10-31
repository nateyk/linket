import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Popover} from '@shadcn/popover/popover';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {formatMoney} from '@ui/i18n/format-money';
import {
  ArrowLeftIcon,
  BanknoteIcon,
  CircleQuestionMarkIcon,
  EditIcon,
  EllipsisVerticalIcon,
  InboxIcon,
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
        <DashboardLayout.SectionTitle>
          <Trans message="Creator withdrawal methods" />
          <InfoTrigger />
        </DashboardLayout.SectionTitle>
        <div className="ms-auto flex min-w-0 shrink-0 flex-wrap items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="hidden sm:inline-flex"
            nativeButton={false}
            render={<Link to="/admin/financial/withdrawal-methods" />}
          >
            <Trans message="Receiving accounts" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="hidden md:inline-flex"
            nativeButton={false}
            render={<Link to="/admin/withdrawals" />}
          >
            <ArrowLeftIcon />
            <Trans message="Withdrawals" />
          </Button>
          <Button
            color="primary"
            size="sm"
            nativeButton={false}
            render={<Link to="/admin/financial/withdrawal-methods/create" />}
          >
            <PlusIcon />
            <span className="hidden xs:inline sm:inline">
              <Trans message="New method" />
            </span>
          </Button>
        </div>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="min-w-0 overflow-x-hidden overflow-y-auto">
        <div className="mx-auto w-full min-w-0 max-w-5xl px-4 py-6 sm:px-0">
          <p className="mb-5 text-sm text-muted-foreground">
            <Trans message="These legacy payout destinations are for creator withdrawals and historical Chapa records. Creator receiving-account reviews live under Receiving accounts." />
          </p>
          <div className="mb-4 flex flex-wrap gap-2 sm:hidden">
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link to="/admin/financial/withdrawal-methods" />}
            >
              <Trans message="Receiving accounts" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              nativeButton={false}
              render={<Link to="/admin/withdrawals" />}
            >
              <ArrowLeftIcon />
              <Trans message="Withdrawals" />
            </Button>
          </div>
          {error && (
            <div className="mb-5 rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <Card.Root className="min-w-0">
            <Card.Header>
              <Card.Title>
                <Trans message="Withdrawal destinations" />
              </Card.Title>
              <Card.Description>
                <Trans message="Hidden from the direct-payment checkout experience. Keep this list for authorized withdrawal operations only." />
              </Card.Description>
            </Card.Header>
            <Card.Content className="min-w-0">
              {loading ? (
                <div className="flex flex-col gap-3">
                  {Array.from({length: 4}, (_, index) => (
                    <div
                      key={index}
                      className="h-16 animate-pulse rounded-input bg-muted"
                    />
                  ))}
                </div>
              ) : methods.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <InboxIcon className="mb-3 size-10 text-muted-foreground/50" />
                  <p className="font-medium">
                    <Trans message="No withdrawal methods" />
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    <Trans message="Create a method so creators can request payouts." />
                  </p>
                </div>
              ) : (
                <>
                  <div className="hidden min-w-0 overflow-x-auto md:block">
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
                          <Table.Head />
                        </Table.Row>
                      </Table.Header>
                      <Table.Body>
                        {methods.map(method => (
                          <Table.Row key={method.id}>
                            <Table.Cell>
                              <MethodIdentity method={method} />
                            </Table.Cell>
                            <Table.Cell className="text-muted-foreground">
                              {method.destination_label ?? '—'}
                            </Table.Cell>
                            <Table.Cell className="text-muted-foreground">
                              {formatRange(method)}
                            </Table.Cell>
                            <Table.Cell>
                              <StatusBadge active={method.is_active} />
                            </Table.Cell>
                            <Table.Cell>
                              <div className="flex justify-end">
                                <MethodActions
                                  method={method}
                                  onDelete={() => setDeleteTarget(method)}
                                />
                              </div>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                      </Table.Body>
                    </Table.Root>
                  </div>

                  <div className="flex flex-col gap-3 md:hidden">
                    {methods.map(method => (
                      <Card.Root key={method.id} size="sm" className="min-w-0">
                        <Card.Header className="flex-row items-start justify-between gap-2 space-y-0">
                          <div className="min-w-0">
                            <Card.Title className="truncate text-base">
                              {method.name}
                            </Card.Title>
                            <Card.Description className="truncate">
                              {method.code}
                            </Card.Description>
                          </div>
                          <MethodActions
                            method={method}
                            onDelete={() => setDeleteTarget(method)}
                          />
                        </Card.Header>
                        <Card.Content className="flex flex-col gap-2 text-sm">
                          <StatusBadge active={method.is_active} />
                          <p className="text-muted-foreground">
                            <Trans message="Destination" />:{' '}
                            {method.destination_label ?? '—'}
                          </p>
                          <p className="text-muted-foreground">
                            <Trans message="Range" />: {formatRange(method)}
                          </p>
                          {method.instructions ? (
                            <p className="break-words text-muted-foreground">
                              {method.instructions}
                            </p>
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            nativeButton={false}
                            render={
                              <Link
                                to={`/admin/financial/withdrawal-methods/${method.id}/edit`}
                              />
                            }
                          >
                            <EditIcon />
                            <Trans message="Edit" />
                          </Button>
                        </Card.Content>
                      </Card.Root>
                    ))}
                  </div>
                </>
              )}
            </Card.Content>
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>

      <Dialog.Root
        open={!!deleteTarget}
        disablePointerDismissal={deleting}
        onOpenChange={open => {
          if (!open && !deleting) {
            setDeleteTarget(undefined);
          }
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop />
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
              <Button
                variant="outline"
                onClick={() => setDeleteTarget(undefined)}
                disabled={deleting}
              >
                <Trans message="Cancel" />
              </Button>
              <Button
                color="danger"
                onClick={() => void destroy()}
                disabled={deleting}
              >
                <TrashIcon />
                <Trans message="Delete" />
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </DashboardLayout.MainSection>
  );
}

function MethodIdentity({method}: {method: WithdrawalMethod}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted">
        <BanknoteIcon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate font-medium">{method.name}</p>
        <p className="truncate text-xs text-muted-foreground">{method.code}</p>
      </div>
    </div>
  );
}

function StatusBadge({active}: {active: boolean}) {
  return active ? (
    <Badge variant="positive">
      <Trans message="Active" />
    </Badge>
  ) : (
    <Badge variant="outline">
      <Trans message="Inactive" />
    </Badge>
  );
}

function MethodActions({
  method,
  onDelete,
}: {
  method: WithdrawalMethod;
  onDelete: () => void;
}) {
  return (
    <Dropdown>
      <Dropdown.Trigger
        className="flex size-8 items-center justify-center rounded-input hover:bg-muted"
        aria-label="Actions"
      >
        <EllipsisVerticalIcon className="size-4 text-muted-foreground" />
      </Dropdown.Trigger>
      <Dropdown.Content align="end">
        <Dropdown.Item
          onClick={() =>
            (window.location.href = `/admin/financial/withdrawal-methods/${method.id}/edit`)
          }
        >
          <EditIcon className="size-4" />
          <Trans message="Edit" />
        </Dropdown.Item>
        <Dropdown.Separator />
        <Dropdown.Item
          className="text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          <TrashIcon className="size-4" />
          <Trans message="Delete" />
        </Dropdown.Item>
      </Dropdown.Content>
    </Dropdown>
  );
}

function formatRange(method: WithdrawalMethod) {
  const min = method.minimum_amount_cents ?? 0;
  const max = method.maximum_amount_cents;
  const range = `${formatMoney(min)} – ${max != null ? formatMoney(max) : '∞'}`;
  return max != null || min > 0 ? range : '—';
}

function InfoTrigger() {
  return (
    <Popover.Root>
      <Popover.Trigger
        render={<Button variant="ghost" size="icon-sm" />}
        className="text-muted-foreground"
        openOnHover
      >
        <CircleQuestionMarkIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <Trans message="Configure payout methods creators can use to withdraw their earnings." />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

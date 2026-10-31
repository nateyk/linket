import {BanUsersDialog} from '@common/admin/users/ban-users-dialog';
import {unbanUsersOptions} from '@common/admin/users/users-queries';
import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Alert} from '@shadcn/alert/alert';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Empty} from '@shadcn/empty/empty';
import {Select} from '@shadcn/forms/select/select';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Spinner} from '@shadcn/spinner/spinner';
import {Table} from '@shadcn/table/table';
import {Tabs} from '@shadcn/tabs/tabs';
import {toast} from '@shadcn/toast/toast';
import {Trans} from '@ui/i18n/trans';
import {useMutation} from '@tanstack/react-query';
import {EllipsisVerticalIcon} from 'lucide-react';
import {parseAsString, useQueryState} from 'nuqs';
import {useCallback, useEffect, useState} from 'react';
import {Link, useParams} from 'react-router';

type CreatorDetail = {
  profile: {
    id: number;
    name: string;
    email: string;
    username?: string;
    is_suspended: boolean;
    banned_at?: string | null;
    created_at?: string | null;
  };
  plan: {name?: string; is_pro: boolean; free: boolean};
  subscription?: {
    gateway_name?: string;
    gateway_status?: string;
    renews_at?: string;
    ends_at?: string;
    price?: {amount: number; currency: string; interval?: string};
  } | null;
  verified_sales: {
    consumed: number;
    remaining: number;
    limit: number;
    is_pro: boolean;
    renews_at?: string | null;
  };
  paid_orders_count: number;
  pending_orders_count?: number;
  sales_total?: number;
  stores: {id: number; name: string; back_half?: string}[];
  products: {id: number; title: string; status: string}[];
  receiving_accounts: {
    id: number;
    provider: string;
    account_name: string;
    lifecycle_state: string;
    checkout_eligible: boolean;
  }[];
  sales: SaleRow[];
  disputes: {uuid: string; status: string; reason: string; created_at: string}[];
  support_conversations_count: number;
  subscription_payments: {
    uuid: string;
    status: string;
    amount: string;
    currency: string;
    verified_at?: string;
  }[];
  audit: {
    id: number;
    comment?: string;
    created_at: string;
    expired_at?: string | null;
  }[];
  links: {edit_user: string; receiving_accounts: string};
};

type SaleRow = {
  uuid: string;
  status: string;
  product_title?: string;
  product_id?: number | null;
  gross_amount_cents: number;
  currency: string;
  paid_at?: string;
  created_at?: string;
  counts_toward_verified_allowance?: boolean;
};

const TAB_VALUES = [
  'overview',
  'storefront',
  'orders',
  'subscriptions',
  'support',
  'audit',
] as const;

type TabValue = (typeof TAB_VALUES)[number];

function isTabValue(value: string | null): value is TabValue {
  return !!value && (TAB_VALUES as readonly string[]).includes(value);
}

export function Component() {
  const {userId} = useParams();
  const [tab, setTab] = useQueryState(
    'tab',
    parseAsString.withDefault('overview'),
  );
  const [detail, setDetail] = useState<CreatorDetail>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [banOpen, setBanOpen] = useState(false);
  const unban = useMutation(unbanUsersOptions);

  const activeTab: TabValue = isTabValue(tab) ? tab : 'overview';

  const load = useCallback(async () => {
    if (!userId) {
      return;
    }
    setLoading(true);
    try {
      const response = await apiClient.get(
        '/api/v1/admin/storefront/creators/' + userId,
      );
      setDetail(response.data.data);
      setError(undefined);
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader>
          <DashboardLayout.SidebarToggle />
          <Skeleton className="h-7 w-48" />
        </DashboardLayout.SectionHeader>
        <DashboardLayout.SectionContent>
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5">
            <Skeleton className="h-28 w-full rounded-card" />
            <Skeleton className="h-64 w-full rounded-card" />
          </div>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    );
  }

  if (!detail) {
    return (
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader>
          <DashboardLayout.SidebarToggle />
          <DashboardLayout.SectionTitle>
            <Trans message="Creator" />
          </DashboardLayout.SectionTitle>
        </DashboardLayout.SectionHeader>
        <DashboardLayout.SectionContent>
          <div className="mx-auto max-w-6xl px-4 py-5">
            <Alert.Root variant="destructive">
              <Alert.Title>
                <Trans message="Creator not found" />
              </Alert.Title>
              <Alert.Description>
                {error ?? (
                  <Trans message="This account is not a creator or could not be loaded." />
                )}
              </Alert.Description>
            </Alert.Root>
            <Button
              className="mt-4"
              variant="outline"
              nativeButton={false}
              render={<Link to="/admin/creators" />}
            >
              <Trans message="All creators" />
            </Button>
          </div>
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    );
  }

  const {profile} = detail;
  const planLabel = detail.plan.is_pro
    ? 'Pro'
    : (detail.plan.name ?? 'Free');

  return (
    <DashboardLayout.MainSection>
      <StaticPageTitle>{profile.name}</StaticPageTitle>
      <DashboardLayout.SectionHeader className="h-auto min-h-14 flex-wrap py-2">
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle className="min-w-0">
          <span className="truncate">{profile.name}</span>
          {profile.is_suspended ? (
            <Badge variant="destructive" className="ms-1 shrink-0">
              <Trans message="Suspended" />
            </Badge>
          ) : (
            <Badge variant="secondary" className="ms-1 shrink-0">
              <Trans message="Active" />
            </Badge>
          )}
        </DashboardLayout.SectionTitle>
        <div className="ms-auto flex shrink-0 items-center gap-2">
          {profile.is_suspended ? (
            <Button
              variant="outline"
              disabled={unban.isPending}
              onClick={() =>
                unban.mutate([profile.id], {
                  onSuccess: () => {
                    toast.success(<Trans message="Account reactivated" />);
                    void load();
                  },
                  onError: reason =>
                    toast.error(getApiErrorMessage(reason) ?? 'Request failed'),
                })
              }
            >
              {unban.isPending ? <Spinner data-icon="inline-start" /> : null}
              <span className="hidden sm:inline">
                <Trans message="Reactivate account" />
              </span>
              <span className="sm:hidden">
                <Trans message="Reactivate" />
              </span>
            </Button>
          ) : (
            <Button color="danger" onClick={() => setBanOpen(true)}>
              <span className="hidden sm:inline">
                <Trans message="Suspend account" />
              </span>
              <span className="sm:hidden">
                <Trans message="Suspend" />
              </span>
            </Button>
          )}
          <div className="hidden items-center gap-2 sm:flex">
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/admin/creators" />}
            >
              <Trans message="All creators" />
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to={detail.links.edit_user} />}
            >
              <Trans message="User settings" />
            </Button>
          </div>
          <Dropdown.Root>
            <Dropdown.Trigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:hidden"
                  aria-label="Creator actions"
                />
              }
            >
              <EllipsisVerticalIcon />
            </Dropdown.Trigger>
            <Dropdown.Content align="end">
              <Dropdown.LinkItem render={<Link to="/admin/creators" />}>
                <Trans message="All creators" />
              </Dropdown.LinkItem>
              <Dropdown.LinkItem render={<Link to={detail.links.edit_user} />}>
                <Trans message="User settings" />
              </Dropdown.LinkItem>
            </Dropdown.Content>
          </Dropdown.Root>
        </div>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5">
          {error && (
            <Alert.Root variant="destructive">
              <Alert.Description>{error}</Alert.Description>
            </Alert.Root>
          )}

          <Card.Root size="sm">
            <Card.Content className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{profile.email}</p>
                <p className="text-sm text-muted-foreground">
                  <Trans message="Plan: :plan" values={{plan: planLabel}} />
                  {profile.username ? ` · @${profile.username}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline">
                  <Trans
                    message=":used/:limit verified sales"
                    values={{
                      used: detail.verified_sales.consumed,
                      limit: detail.verified_sales.limit,
                    }}
                  />
                </Badge>
                <Badge variant="outline">
                  <Trans
                    message=":count paid orders"
                    values={{count: detail.paid_orders_count}}
                  />
                </Badge>
                {(detail.pending_orders_count ?? 0) > 0 && (
                  <Badge variant="secondary">
                    <Trans
                      message=":count pending"
                      values={{count: detail.pending_orders_count}}
                    />
                  </Badge>
                )}
              </div>
            </Card.Content>
          </Card.Root>

          <Tabs.Root
            value={activeTab}
            onValueChange={value => void setTab(String(value))}
            className="gap-4"
          >
            <Tabs.List
              variant="line"
              className="mb-1 w-full max-w-full overflow-x-auto px-1"
            >
              <Tabs.Tab value="overview">
                <Trans message="Overview" />
              </Tabs.Tab>
              <Tabs.Tab value="storefront">
                <Trans message="Storefronts & products" />
              </Tabs.Tab>
              <Tabs.Tab value="orders">
                <Trans message="Orders & sales" />
              </Tabs.Tab>
              <Tabs.Tab value="subscriptions">
                <Trans message="Subscriptions" />
              </Tabs.Tab>
              <Tabs.Tab value="support">
                <Trans message="Support & disputes" />
              </Tabs.Tab>
              <Tabs.Tab value="audit">
                <Trans message="Activity & audit" />
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="overview" className="flex flex-col gap-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card.Root>
                  <Card.Header>
                    <Card.Title>
                      <Trans message="Profile & plan" />
                    </Card.Title>
                  </Card.Header>
                  <Card.Content className="flex flex-col gap-2 text-sm">
                    <p>{profile.email}</p>
                    <p>
                      <Trans
                        message="Plan: :plan"
                        values={{plan: planLabel}}
                      />
                    </p>
                    {detail.subscription && (
                      <>
                        <p>
                          <Trans
                            message="Renewal: :date"
                            values={{
                              date: detail.subscription.renews_at
                                ? formatDate(detail.subscription.renews_at)
                                : '—',
                            }}
                          />
                        </p>
                        <p>
                          <Trans
                            message="Expires: :date"
                            values={{
                              date: detail.subscription.ends_at
                                ? formatDate(detail.subscription.ends_at)
                                : '—',
                            }}
                          />
                        </p>
                        <p>
                          <Trans
                            message="Gateway: :gateway · :status"
                            values={{
                              gateway:
                                detail.subscription.gateway_name ?? '—',
                              status: friendlyStatus(
                                detail.subscription.gateway_status,
                              ),
                            }}
                          />
                        </p>
                      </>
                    )}
                    <p className="text-muted-foreground">
                      <Trans message="Pro is only granted through paid subscription records. Admins cannot activate unpaid Pro here." />
                    </p>
                  </Card.Content>
                </Card.Root>
                <Card.Root>
                  <Card.Header>
                    <Card.Title>
                      <Trans message="Verified sales allowance" />
                    </Card.Title>
                    <Card.Description>
                      <Trans message="Pending payment orders do not consume verified sales allowance." />
                    </Card.Description>
                  </Card.Header>
                  <Card.Content className="flex flex-col gap-2 text-sm">
                    <p>
                      <Trans
                        message=":used of :limit used · :remaining remaining"
                        values={{
                          used: detail.verified_sales.consumed,
                          limit: detail.verified_sales.limit,
                          remaining: detail.verified_sales.remaining,
                        }}
                      />
                    </p>
                    <p>
                      <Trans
                        message="Paid orders: :count"
                        values={{count: detail.paid_orders_count}}
                      />
                    </p>
                    <p>
                      <Trans
                        message="Pending orders: :count"
                        values={{count: detail.pending_orders_count ?? 0}}
                      />
                    </p>
                  </Card.Content>
                </Card.Root>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <SummaryStat
                  label="Storefronts"
                  value={String(detail.stores.length)}
                />
                <SummaryStat
                  label="Products"
                  value={String(detail.products.length)}
                />
              </div>
              <Card.Root size="sm">
                <Card.Content className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      <Trans message="Receiving accounts" />
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <Trans
                        message=":count on file. Review ownership and Verify.et registration from Receiving accounts."
                        values={{count: detail.receiving_accounts.length}}
                      />
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    nativeButton={false}
                    render={
                      <Link
                        to={
                          detail.links.receiving_accounts +
                          (profile.email
                            ? `?search=${encodeURIComponent(profile.email)}`
                            : '')
                        }
                      />
                    }
                  >
                    <Trans message="Open receiving accounts" />
                  </Button>
                </Card.Content>
              </Card.Root>
            </Tabs.Panel>

            <Tabs.Panel value="storefront" className="flex flex-col gap-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card.Root>
                  <Card.Header>
                    <Card.Title>
                      <Trans message="Storefronts" />
                    </Card.Title>
                  </Card.Header>
                  <Card.Content>
                    {detail.stores.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        <Trans message="No storefronts." />
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2 text-sm">
                        {detail.stores.map(store => (
                          <li key={store.id} className="rounded-card-sm border px-3 py-2">
                            <p className="font-medium">{store.name}</p>
                            {store.back_half && (
                              <p className="text-muted-foreground">
                                /{store.back_half}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card.Content>
                </Card.Root>
                <Card.Root>
                  <Card.Header>
                    <Card.Title>
                      <Trans message="Products" />
                    </Card.Title>
                  </Card.Header>
                  <Card.Content>
                    {detail.products.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        <Trans message="No products." />
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2 text-sm">
                        {detail.products.map(product => (
                          <li
                            key={product.id}
                            className="flex items-center justify-between gap-2 rounded-card-sm border px-3 py-2"
                          >
                            <Link
                              className="min-w-0 truncate text-primary underline"
                              to={'/admin/items/' + product.id}
                            >
                              {product.title}
                            </Link>
                            <Badge variant="outline">
                              {friendlyStatus(product.status)}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card.Content>
                </Card.Root>
              </div>
            </Tabs.Panel>

            <Tabs.Panel value="orders">
              <CreatorSalesTable
                userId={profile.id}
                initialSales={detail.sales}
                paidCount={detail.paid_orders_count}
                pendingCount={detail.pending_orders_count ?? 0}
                totalCount={detail.sales_total ?? detail.sales.length}
              />
            </Tabs.Panel>

            <Tabs.Panel value="subscriptions" className="flex flex-col gap-4">
              <Card.Root>
                <Card.Header>
                  <Card.Title>
                    <Trans message="Subscription" />
                  </Card.Title>
                </Card.Header>
                <Card.Content className="flex flex-col gap-2 text-sm">
                  {detail.subscription ? (
                    <>
                      <p>
                        <Trans
                          message="Plan: :plan"
                          values={{plan: planLabel}}
                        />
                      </p>
                      <p>
                        <Trans
                          message="Gateway: :gateway · :status"
                          values={{
                            gateway: detail.subscription.gateway_name ?? '—',
                            status: friendlyStatus(
                              detail.subscription.gateway_status,
                            ),
                          }}
                        />
                      </p>
                      {detail.subscription.price && (
                        <p>
                          {detail.subscription.price.amount}{' '}
                          {detail.subscription.price.currency}
                          {detail.subscription.price.interval
                            ? ` / ${detail.subscription.price.interval}`
                            : ''}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-muted-foreground">
                      <Trans message="No paid subscription on this account." />
                    </p>
                  )}
                </Card.Content>
              </Card.Root>
              <Card.Root>
                <Card.Header>
                  <Card.Title>
                    <Trans message="Subscription payments" />
                  </Card.Title>
                </Card.Header>
                <Card.Content>
                  {detail.subscription_payments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      <Trans message="No subscription payments recorded." />
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table.Root>
                        <Table.Header>
                          <Table.Row>
                            <Table.Head>
                              <Trans message="Status" />
                            </Table.Head>
                            <Table.Head>
                              <Trans message="Amount" />
                            </Table.Head>
                            <Table.Head>
                              <Trans message="Verified" />
                            </Table.Head>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {detail.subscription_payments.map(payment => (
                            <Table.Row key={payment.uuid}>
                              <Table.Cell>
                                <Badge variant="outline">
                                  {friendlyStatus(payment.status)}
                                </Badge>
                              </Table.Cell>
                              <Table.Cell>
                                {payment.amount} {payment.currency}
                              </Table.Cell>
                              <Table.Cell>
                                {payment.verified_at
                                  ? formatDate(payment.verified_at)
                                  : '—'}
                              </Table.Cell>
                            </Table.Row>
                          ))}
                        </Table.Body>
                      </Table.Root>
                    </div>
                  )}
                </Card.Content>
              </Card.Root>
            </Tabs.Panel>

            <Tabs.Panel value="support" className="flex flex-col gap-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <Card.Root>
                  <Card.Header>
                    <Card.Title>
                      <Trans message="Payment disputes" />
                    </Card.Title>
                  </Card.Header>
                  <Card.Content>
                    {detail.disputes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        <Trans message="No disputes." />
                      </p>
                    ) : (
                      <ul className="flex flex-col gap-2 text-sm">
                        {detail.disputes.map(dispute => (
                          <li
                            key={dispute.uuid}
                            className="rounded-card-sm border px-3 py-2"
                          >
                            <p className="font-medium">
                              {friendlyStatus(dispute.reason)}
                            </p>
                            <p className="text-muted-foreground">
                              {friendlyStatus(dispute.status)} ·{' '}
                              {formatDate(dispute.created_at)}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card.Content>
                </Card.Root>
                <Card.Root>
                  <Card.Header>
                    <Card.Title>
                      <Trans message="Support" />
                    </Card.Title>
                  </Card.Header>
                  <Card.Content className="text-sm">
                    <p>
                      <Trans
                        message=":count linked conversations"
                        values={{count: detail.support_conversations_count}}
                      />
                    </p>
                  </Card.Content>
                </Card.Root>
              </div>
            </Tabs.Panel>

            <Tabs.Panel value="audit">
              <Card.Root>
                <Card.Header>
                  <Card.Title>
                    <Trans message="Suspension audit" />
                  </Card.Title>
                </Card.Header>
                <Card.Content>
                  {detail.audit.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      <Trans message="No suspension history." />
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-3 text-sm">
                      {detail.audit.map(entry => (
                        <li
                          key={entry.id}
                          className="rounded-card-sm border px-3 py-2"
                        >
                          <p className="font-medium">
                            {entry.comment ?? <Trans message="Suspended" />}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(entry.created_at)}
                            {entry.expired_at
                              ? ` · ends ${formatDate(entry.expired_at)}`
                              : ''}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </Card.Content>
              </Card.Root>
            </Tabs.Panel>
          </Tabs.Root>
        </div>
      </DashboardLayout.SectionContent>
      <BanUsersDialog
        userIds={[profile.id]}
        open={banOpen}
        onOpenChange={setBanOpen}
        onSuccess={() => {
          toast.success(<Trans message="Account suspended" />);
          void load();
        }}
      />
    </DashboardLayout.MainSection>
  );
}

function CreatorSalesTable({
  userId,
  initialSales,
  paidCount,
  pendingCount,
  totalCount,
}: {
  userId: number;
  initialSales: SaleRow[];
  paidCount: number;
  pendingCount: number;
  totalCount: number;
}) {
  const [sales, setSales] = useState(initialSales);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [status, setStatus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(
    async (nextPage: number, nextStatus: string) => {
      setLoading(true);
      try {
        const response = await apiClient.get(
          `/api/v1/admin/storefront/creators/${userId}/sales`,
          {
            params: {
              page: nextPage,
              status: nextStatus === 'all' ? undefined : nextStatus,
              per_page: 15,
            },
          },
        );
        setSales(response.data.data?.data ?? []);
        setLastPage(response.data.data?.last_page ?? 1);
        setPage(response.data.data?.current_page ?? nextPage);
        setError(undefined);
      } catch (reason) {
        setError(getApiErrorMessage(reason));
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    void load(1, status);
  }, [load, status]);

  return (
    <Card.Root>
      <Card.Header className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Card.Title>
            <Trans message="Orders & sales" />
          </Card.Title>
          <Card.Description>
            <Trans
              message=":paid paid · :pending pending · :total total. Only paid orders count toward verified sales."
              values={{paid: paidCount, pending: pendingCount, total: totalCount}}
            />
          </Card.Description>
        </div>
        <Select.Root
          value={status}
          onValueChange={value => setStatus(String(value ?? 'all'))}
        >
          <Select.Trigger className="w-full sm:w-44">
            <Select.Value placeholder={<Trans message="All statuses" />} />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="all">
              <Trans message="All statuses" />
            </Select.Item>
            <Select.Item value="paid">
              <Trans message="Paid" />
            </Select.Item>
            <Select.Item value="fulfilled">
              <Trans message="Fulfilled" />
            </Select.Item>
            <Select.Item value="pending_payment">
              <Trans message="Pending payment" />
            </Select.Item>
            <Select.Item value="verifying">
              <Trans message="Verifying" />
            </Select.Item>
            <Select.Item value="manual_review">
              <Trans message="Manual review" />
            </Select.Item>
            <Select.Item value="expired">
              <Trans message="Expired" />
            </Select.Item>
            <Select.Item value="failed_verification">
              <Trans message="Failed verification" />
            </Select.Item>
          </Select.Content>
        </Select.Root>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : sales.length === 0 ? (
          <Empty.Root className="border-0 py-6">
            <Empty.Header>
              <Empty.Title>
                <Trans message="No orders found" />
              </Empty.Title>
              <Empty.Description>
                <Trans message="Orders for this creator will appear here with payment status and amounts." />
              </Empty.Description>
            </Empty.Header>
          </Empty.Root>
        ) : (
          <div className="overflow-x-auto">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head>
                    <Trans message="Order" />
                  </Table.Head>
                  <Table.Head>
                    <Trans message="Product" />
                  </Table.Head>
                  <Table.Head>
                    <Trans message="Amount" />
                  </Table.Head>
                  <Table.Head>
                    <Trans message="Payment" />
                  </Table.Head>
                  <Table.Head>
                    <Trans message="Date" />
                  </Table.Head>
                  <Table.Head className="text-end">
                    <Trans message="Detail" />
                  </Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sales.map(sale => (
                  <Table.Row key={sale.uuid}>
                    <Table.Cell className="font-mono text-xs">
                      {sale.uuid.slice(0, 8)}…
                    </Table.Cell>
                    <Table.Cell className="max-w-[14rem] truncate">
                      {sale.product_title ?? '—'}
                    </Table.Cell>
                    <Table.Cell className="tabular-nums">
                      {(sale.gross_amount_cents / 100).toFixed(2)}{' '}
                      {sale.currency}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge
                          variant={
                            sale.status === 'paid' ? 'default' : 'outline'
                          }
                        >
                          {friendlyStatus(sale.status)}
                        </Badge>
                        {sale.counts_toward_verified_allowance ? (
                          <Badge variant="secondary" title="Counts toward verified sales">
                            <Trans message="Verified" />
                          </Badge>
                        ) : sale.status === 'pending_payment' ||
                          sale.status === 'verifying' ? (
                          <Badge
                            variant="outline"
                            title="Pending payment does not consume verified sales"
                          >
                            <Trans message="Not counted" />
                          </Badge>
                        ) : null}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      {formatDate(sale.paid_at ?? sale.created_at)}
                    </Table.Cell>
                    <Table.Cell className="text-end">
                      {sale.product_id ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          nativeButton={false}
                          render={
                            <Link to={'/admin/items/' + sale.product_id} />
                          }
                        >
                          <Trans message="Product" />
                        </Button>
                      ) : (
                        '—'
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            disabled={page <= 1 || loading}
            onClick={() => void load(page - 1, status)}
          >
            <Trans message="Previous" />
          </Button>
          <Button
            variant="outline"
            disabled={page >= lastPage || loading}
            onClick={() => void load(page + 1, status)}
          >
            <Trans message="Next" />
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  );
}

function SummaryStat({label, value}: {label: string; value: string}) {
  return (
    <Card.Root size="sm">
      <Card.Content className="py-4">
        <p className="text-sm text-muted-foreground">
          <Trans message={label} />
        </p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </Card.Content>
    </Card.Root>
  );
}

function formatDate(value?: string | null) {
  if (!value) {
    return '—';
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function friendlyStatus(status?: string | null) {
  switch (status) {
    case 'draft':
      return <Trans message="Draft" />;
    case 'published':
      return <Trans message="Published" />;
    case 'approved':
      return <Trans message="Approved" />;
    case 'pending':
      return <Trans message="Pending" />;
    case 'pending payment':
    case 'pending_payment':
      return <Trans message="Pending payment" />;
    case 'verifying':
      return <Trans message="Verifying" />;
    case 'fulfilled':
      return <Trans message="Fulfilled" />;
    case 'failed_verification':
      return <Trans message="Failed verification" />;
    case 'manual_review':
      return <Trans message="Manual review" />;
    case 'active':
      return <Trans message="Active" />;
    case 'past_due':
      return <Trans message="Past due" />;
    case 'expired':
      return <Trans message="Expired" />;
    case 'paid':
      return <Trans message="Paid" />;
    case 'cancelled':
      return <Trans message="Cancelled" />;
    case 'refunded':
      return <Trans message="Refunded" />;
    case 'wrong_reference':
      return <Trans message="Wrong payment reference" />;
    default:
      return status ? status.replaceAll('_', ' ') : '—';
  }
}

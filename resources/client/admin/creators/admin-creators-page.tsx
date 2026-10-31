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
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Table} from '@shadcn/table/table';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  EllipsisVerticalIcon,
  InfoIcon,
  RefreshCwIcon,
  SearchIcon,
  StoreIcon,
  UsersIcon,
  XCircleIcon,
} from 'lucide-react';
import {parseAsInteger, parseAsString, useQueryStates} from 'nuqs';
import {type ReactNode, useCallback, useEffect, useMemo, useState} from 'react';
import {Link} from 'react-router';

type Overview = {
  total_creators: number;
  active_accounts: number;
  suspended_accounts: number;
  free_plan_creators: number;
  pro_plan_creators: number;
  verified_sales_consumed: number;
  expiring_subscriptions?: number;
  expired_subscriptions?: number;
  pending_renewal_subscriptions?: number;
  pending_receiving_reviews?: number;
  creators_needing_attention?: number;
};

type CreatorRow = {
  id: number;
  name: string;
  email: string;
  is_suspended: boolean;
  plan_name?: string;
  is_pro: boolean;
  subscription_lifecycle?: string | null;
  verified_sales_consumed: number;
  verified_sales_remaining: number;
  stores_count: number;
  products_count: number;
  pending_receiving_accounts_count?: number;
  needs_attention?: boolean;
};

const filterParsers = {
  page: parseAsInteger.withDefault(1),
  search: parseAsString.withDefault(''),
  plan: parseAsString.withDefault(''),
  status: parseAsString.withDefault(''),
  subscription: parseAsString.withDefault(''),
  attention: parseAsString.withDefault(''),
  sort: parseAsString.withDefault('-created_at'),
};

export function Component() {
  const [filters, setFilters] = useQueryStates(filterParsers, {shallow: false});
  const [overview, setOverview] = useState<Overview>();
  const [creators, setCreators] = useState<CreatorRow[]>([]);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [searchDraft, setSearchDraft] = useState(filters.search);

  const attention = filters.attention === '1';
  const isFiltering = Boolean(
    filters.search ||
      filters.plan ||
      filters.status ||
      filters.subscription ||
      attention,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewResponse, listResponse] = await Promise.all([
        apiClient.get('/api/v1/admin/storefront/creators/overview'),
        apiClient.get('/api/v1/admin/storefront/creators', {
          params: {
            page: filters.page,
            search: filters.search.trim() || undefined,
            plan: filters.plan || undefined,
            status: filters.status || undefined,
            subscription: filters.subscription || undefined,
            attention: attention ? 1 : undefined,
            sort: filters.sort || undefined,
          },
        }),
      ]);
      setOverview(overviewResponse.data.data);
      setCreators(listResponse.data.data?.data ?? []);
      setLastPage(listResponse.data.data?.last_page ?? 1);
      setTotal(listResponse.data.data?.total ?? 0);
      setError(undefined);
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally {
      setLoading(false);
    }
  }, [
    attention,
    filters.page,
    filters.plan,
    filters.search,
    filters.sort,
    filters.status,
    filters.subscription,
  ]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  const applySearch = () => {
    void setFilters({search: searchDraft.trim() || null, page: 1});
  };

  const clearFilters = () => {
    setSearchDraft('');
    void setFilters({
      search: null,
      plan: null,
      status: null,
      subscription: null,
      attention: null,
      page: 1,
    });
  };

  const needingAttention = overview?.creators_needing_attention ?? 0;

  const metricFilters = useMemo(
    () => [
      {
        key: 'all',
        label: 'Total creators',
        value: overview?.total_creators ?? 0,
        icon: <UsersIcon />,
        active: !isFiltering,
        onClick: () => clearFilters(),
      },
      {
        key: 'active',
        label: 'Active',
        value: overview?.active_accounts ?? 0,
        icon: <BadgeCheckIcon />,
        tone: 'positive' as const,
        active: filters.status === 'active',
        onClick: () =>
          void setFilters({
            status: filters.status === 'active' ? null : 'active',
            page: 1,
          }),
      },
      {
        key: 'suspended',
        label: 'Suspended',
        value: overview?.suspended_accounts ?? 0,
        icon: <XCircleIcon />,
        tone:
          (overview?.suspended_accounts ?? 0) > 0
            ? ('warning' as const)
            : ('default' as const),
        active: filters.status === 'suspended',
        onClick: () =>
          void setFilters({
            status: filters.status === 'suspended' ? null : 'suspended',
            page: 1,
          }),
      },
      {
        key: 'free',
        label: 'Free',
        value: overview?.free_plan_creators ?? 0,
        icon: <StoreIcon />,
        active: filters.plan === 'free',
        onClick: () =>
          void setFilters({
            plan: filters.plan === 'free' ? null : 'free',
            page: 1,
          }),
      },
      {
        key: 'pro',
        label: 'Pro',
        value: overview?.pro_plan_creators ?? 0,
        icon: <BadgeCheckIcon />,
        tone: 'positive' as const,
        active: filters.plan === 'pro',
        onClick: () =>
          void setFilters({
            plan: filters.plan === 'pro' ? null : 'pro',
            page: 1,
          }),
      },
      {
        key: 'attention',
        label: 'Needs attention',
        value: needingAttention,
        icon: <AlertTriangleIcon />,
        tone: needingAttention > 0 ? ('warning' as const) : ('default' as const),
        active: attention,
        onClick: () =>
          void setFilters({
            attention: attention ? null : '1',
            page: 1,
          }),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps -- clearFilters/setFilters stable enough for metric strip
    [
      attention,
      filters.plan,
      filters.status,
      isFiltering,
      needingAttention,
      overview,
    ],
  );

  return (
    <DashboardLayout.MainSection>
      <StaticPageTitle>
        <Trans message="Creators" />
      </StaticPageTitle>
      <DashboardLayout.SectionHeader className="h-auto min-h-14 flex-wrap py-2">
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle className="min-w-0">
          <span className="truncate">
            <Trans message="Creators" />
          </span>
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="shrink-0 text-muted-foreground"
                    aria-label="About creators"
                  />
                }
              >
                <InfoIcon />
              </Tooltip.Trigger>
              <Tooltip.Content side="bottom" className="max-w-xs">
                <Trans message="Manage creator accounts, plans, storefronts, and sales. Pending orders do not consume verified sales allowance." />
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        </DashboardLayout.SectionTitle>
        <div className="ms-auto flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            className="hidden sm:inline-flex"
            onClick={() => void load()}
          >
            <RefreshCwIcon data-icon="inline-start" />
            <Trans message="Refresh" />
          </Button>
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
              <Dropdown.Item onClick={() => void load()}>
                <RefreshCwIcon />
                <Trans message="Refresh" />
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Root>
        </div>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-5">
          {error && (
            <Alert.Root variant="destructive">
              <Alert.Title>
                <Trans message="Unable to load creators" />
              </Alert.Title>
              <Alert.Description>{error}</Alert.Description>
            </Alert.Root>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
            {overview
              ? metricFilters.map(metric => (
                  <MetricCard
                    key={metric.key}
                    label={metric.label}
                    value={String(metric.value)}
                    icon={metric.icon}
                    tone={metric.tone}
                    active={metric.active}
                    onClick={metric.onClick}
                  />
                ))
              : Array.from({length: 6}).map((_, index) => (
                  <Skeleton key={index} className="h-20 rounded-card" />
                ))}
          </div>

          {(overview?.expiring_subscriptions ||
            overview?.expired_subscriptions ||
            overview?.pending_renewal_subscriptions) ? (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span>
                <Trans
                  message="Expiring Pro: :count"
                  values={{count: overview?.expiring_subscriptions ?? 0}}
                />
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <Trans
                  message="Expired Pro: :count"
                  values={{count: overview?.expired_subscriptions ?? 0}}
                />
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <Trans
                  message="Pending renewal: :count"
                  values={{count: overview?.pending_renewal_subscriptions ?? 0}}
                />
              </span>
              <span aria-hidden="true">·</span>
              <span>
                <Trans
                  message="Verified sales used: :count"
                  values={{count: overview?.verified_sales_consumed ?? 0}}
                />
              </span>
            </div>
          ) : null}

          <Card.Root>
            <Card.Header className="gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Card.Title>
                  <Trans message="Creator directory" />
                </Card.Title>
                <Card.Description>
                  <Trans message="Search, filter, and open a creator to manage their account, plan, storefronts, and sales." />
                </Card.Description>
              </div>
              {isFiltering && (
                <Button size="sm" variant="ghost" onClick={clearFilters}>
                  <Trans message="Clear filters" />
                </Button>
              )}
            </Card.Header>
            <Card.Content className="flex flex-col gap-4">
                  <form
                    className="grid gap-3 md:grid-cols-2 xl:grid-cols-6"
                    onSubmit={event => {
                      event.preventDefault();
                      applySearch();
                    }}
                  >
                    <div className="relative md:col-span-2 xl:col-span-2">
                      <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchDraft}
                        onChange={event => setSearchDraft(event.target.value)}
                        placeholder="Search name or email"
                        aria-label="Search"
                        className="ps-9"
                      />
                    </div>
                    <Select.Root
                      value={filters.plan || 'all'}
                      onValueChange={value =>
                        void setFilters({
                          plan: value && value !== 'all' ? String(value) : null,
                          page: 1,
                        })
                      }
                    >
                      <Select.Trigger className="w-full">
                        <Select.Value placeholder={<Trans message="All plans" />} />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="all">
                          <Trans message="All plans" />
                        </Select.Item>
                        <Select.Item value="free">
                          <Trans message="Free" />
                        </Select.Item>
                        <Select.Item value="pro">
                          <Trans message="Pro" />
                        </Select.Item>
                      </Select.Content>
                    </Select.Root>
                    <Select.Root
                      value={filters.status || 'all'}
                      onValueChange={value =>
                        void setFilters({
                          status:
                            value && value !== 'all' ? String(value) : null,
                          page: 1,
                        })
                      }
                    >
                      <Select.Trigger className="w-full">
                        <Select.Value
                          placeholder={<Trans message="All statuses" />}
                        />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="all">
                          <Trans message="All statuses" />
                        </Select.Item>
                        <Select.Item value="active">
                          <Trans message="Active" />
                        </Select.Item>
                        <Select.Item value="suspended">
                          <Trans message="Suspended" />
                        </Select.Item>
                      </Select.Content>
                    </Select.Root>
                    <Select.Root
                      value={filters.subscription || 'all'}
                      onValueChange={value =>
                        void setFilters({
                          subscription:
                            value && value !== 'all' ? String(value) : null,
                          page: 1,
                        })
                      }
                    >
                      <Select.Trigger className="w-full">
                        <Select.Value
                          placeholder={<Trans message="All subscriptions" />}
                        />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="all">
                          <Trans message="All subscriptions" />
                        </Select.Item>
                        <Select.Item value="expiring">
                          <Trans message="Expiring" />
                        </Select.Item>
                        <Select.Item value="expired">
                          <Trans message="Expired" />
                        </Select.Item>
                        <Select.Item value="pending_renewal">
                          <Trans message="Pending renewal" />
                        </Select.Item>
                      </Select.Content>
                    </Select.Root>
                    <Select.Root
                      value={attention ? 'attention' : 'all'}
                      onValueChange={value =>
                        void setFilters({
                          attention: value === 'attention' ? '1' : null,
                          page: 1,
                        })
                      }
                    >
                      <Select.Trigger className="w-full">
                        <Select.Value
                          placeholder={<Trans message="All creators" />}
                        />
                      </Select.Trigger>
                      <Select.Content>
                        <Select.Item value="all">
                          <Trans message="All creators" />
                        </Select.Item>
                        <Select.Item value="attention">
                          <Trans message="Needs attention" />
                        </Select.Item>
                      </Select.Content>
                    </Select.Root>
                  </form>

                  {loading ? (
                    <div className="flex flex-col gap-2">
                      {Array.from({length: 5}).map((_, index) => (
                        <Skeleton key={index} className="h-14 w-full rounded-card-sm" />
                      ))}
                    </div>
                  ) : creators.length === 0 ? (
                    <CreatorsEmptyState
                      isFiltering={isFiltering}
                      onClearFilters={clearFilters}
                    />
                  ) : (
                    <>
                      <div className="hidden overflow-x-auto md:block">
                        <Table.Root>
                          <Table.Header>
                            <Table.Row>
                              <Table.Head>
                                <Trans message="Creator" />
                              </Table.Head>
                              <Table.Head>
                                <Trans message="Status" />
                              </Table.Head>
                              <Table.Head>
                                <Trans message="Plan" />
                              </Table.Head>
                              <Table.Head>
                                <Trans message="Verified sales" />
                              </Table.Head>
                              <Table.Head>
                                <Trans message="Storefront" />
                              </Table.Head>
                              <Table.Head>
                                <Trans message="Pending actions" />
                              </Table.Head>
                              <Table.Head className="text-end">
                                <Trans message="Actions" />
                              </Table.Head>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {creators.map(creator => (
                              <Table.Row key={creator.id}>
                                <Table.Cell>
                                  <p className="font-medium">{creator.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {creator.email}
                                  </p>
                                </Table.Cell>
                                <Table.Cell>
                                  <div className="flex flex-wrap gap-1">
                                    {creator.is_suspended ? (
                                      <Badge variant="destructive">
                                        <Trans message="Suspended" />
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary">
                                        <Trans message="Active" />
                                      </Badge>
                                    )}
                                    {creator.needs_attention && (
                                      <Badge variant="outline">
                                        <Trans message="Needs review" />
                                      </Badge>
                                    )}
                                  </div>
                                </Table.Cell>
                                <Table.Cell>
                                  <div className="flex flex-col gap-1">
                                    <span>
                                      {creator.is_pro ? (
                                        <Trans message="Pro" />
                                      ) : (
                                        creator.plan_name ?? (
                                          <Trans message="Free" />
                                        )
                                      )}
                                    </span>
                                    {creator.subscription_lifecycle && (
                                      <Badge variant="outline">
                                        {subscriptionLifecycleLabel(
                                          creator.subscription_lifecycle,
                                        )}
                                      </Badge>
                                    )}
                                  </div>
                                </Table.Cell>
                                <Table.Cell>
                                  <Tooltip.Provider>
                                    <Tooltip.Root>
                                      <Tooltip.Trigger className="text-start text-sm">
                                        <Trans
                                          message=":used used · :left left"
                                          values={{
                                            used: creator.verified_sales_consumed,
                                            left: creator.verified_sales_remaining,
                                          }}
                                        />
                                      </Tooltip.Trigger>
                                      <Tooltip.Content className="max-w-xs">
                                        <Trans message="Only paid verified sales consume allowance. Pending payment orders do not." />
                                      </Tooltip.Content>
                                    </Tooltip.Root>
                                  </Tooltip.Provider>
                                </Table.Cell>
                                <Table.Cell>
                                  <Trans
                                    message=":stores stores · :products products"
                                    values={{
                                      stores: creator.stores_count,
                                      products: creator.products_count,
                                    }}
                                  />
                                </Table.Cell>
                                <Table.Cell>
                                  {creator.pending_receiving_accounts_count ?? 0}
                                </Table.Cell>
                                <Table.Cell className="text-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    nativeButton={false}
                                    render={
                                      <Link to={'/admin/creators/' + creator.id} />
                                    }
                                  >
                                    <Trans message="Manage" />
                                  </Button>
                                </Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table.Root>
                      </div>

                      <div className="flex flex-col gap-3 md:hidden">
                        {creators.map(creator => (
                          <Card.Root key={creator.id} size="sm">
                            <Card.Header>
                              <Card.Title className="text-base">
                                {creator.name}
                              </Card.Title>
                              <Card.Description>{creator.email}</Card.Description>
                            </Card.Header>
                            <Card.Content className="flex flex-col gap-3 text-sm">
                              <div className="flex flex-wrap gap-1">
                                {creator.is_suspended ? (
                                  <Badge variant="destructive">
                                    <Trans message="Suspended" />
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    <Trans message="Active" />
                                  </Badge>
                                )}
                                <Badge variant="outline">
                                  {creator.is_pro ? (
                                    <Trans message="Pro" />
                                  ) : (
                                    <Trans message="Free" />
                                  )}
                                </Badge>
                                {creator.needs_attention && (
                                  <Badge variant="outline">
                                    <Trans message="Needs review" />
                                  </Badge>
                                )}
                              </div>
                              <p className="text-muted-foreground">
                                <Trans
                                  message=":stores stores · :products products · :pending pending reviews"
                                  values={{
                                    stores: creator.stores_count,
                                    products: creator.products_count,
                                    pending:
                                      creator.pending_receiving_accounts_count ??
                                      0,
                                  }}
                                />
                              </p>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                nativeButton={false}
                                render={
                                  <Link to={'/admin/creators/' + creator.id} />
                                }
                              >
                                <Trans message="Manage" />
                              </Button>
                            </Card.Content>
                          </Card.Root>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      <Trans
                        message="Page :page of :last · :total creators"
                        values={{page: filters.page, last: lastPage, total}}
                      />
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        disabled={filters.page <= 1 || loading}
                        onClick={() =>
                          void setFilters({page: Math.max(1, filters.page - 1)})
                        }
                      >
                        <Trans message="Previous" />
                      </Button>
                      <Button
                        variant="outline"
                        disabled={filters.page >= lastPage || loading}
                        onClick={() =>
                          void setFilters({page: filters.page + 1})
                        }
                      >
                        <Trans message="Next" />
                      </Button>
                    </div>
                  </div>
            </Card.Content>
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function MetricCard({
  label,
  value,
  icon,
  tone = 'default',
  active = false,
  onClick,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  tone?: 'default' | 'positive' | 'warning';
  active?: boolean;
  onClick?: () => void;
}) {
  const iconClass =
    tone === 'positive'
      ? 'bg-positive/10 text-positive'
      : tone === 'warning'
        ? 'bg-warning/10 text-warning'
        : 'bg-muted text-muted-foreground';

  const card = (
    <Card size="sm" className="gap-0 py-3">
      <Card.Content className="flex items-center gap-3">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-card-sm [&>svg]:size-4',
            iconClass,
          )}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-muted-foreground">
            <Trans message={label} />
          </p>
          <p className="text-lg font-semibold tracking-tight tabular-nums sm:text-xl">
            {value}
          </p>
        </div>
      </Card.Content>
    </Card>
  );

  if (!onClick) {
    return card;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-card text-start transition-opacity hover:opacity-90',
        active && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background',
      )}
    >
      {card}
    </button>
  );
}

function CreatorsEmptyState({
  isFiltering,
  onClearFilters,
}: {
  isFiltering: boolean;
  onClearFilters: () => void;
}) {
  return (
    <Empty.Root className="border-0 py-8">
      <Empty.Header>
        <Empty.Media variant="icon">
          <UsersIcon aria-hidden="true" />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No matching creators" />
          ) : (
            <Trans message="No creators yet" />
          )}
        </Empty.Title>
        <Empty.Description>
          {isFiltering ? (
            <Trans message="Try another search query or different filters." />
          ) : (
            <Trans message="Creators appear here once they own a storefront, product, or receiving account." />
          )}
        </Empty.Description>
      </Empty.Header>
      {isFiltering && (
        <Empty.Content>
          <Button variant="outline" size="sm" onClick={onClearFilters}>
            <Trans message="Clear filters" />
          </Button>
        </Empty.Content>
      )}
    </Empty.Root>
  );
}

function subscriptionLifecycleLabel(lifecycle: string) {
  if (lifecycle === 'expiring') return <Trans message="Expiring" />;
  if (lifecycle === 'expired') return <Trans message="Expired" />;
  if (lifecycle === 'pending_renewal') return <Trans message="Pending renewal" />;
  return lifecycle;
}

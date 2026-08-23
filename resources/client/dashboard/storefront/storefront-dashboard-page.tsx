import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {apiClient} from '@common/http/query-client';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Empty} from '@shadcn/empty/empty';
import {Input} from '@shadcn/forms/input/input';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Table} from '@shadcn/table/table';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {message} from '@ui/i18n/message';
import {getSiteCurrency} from '@ui/i18n/format-money';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {
  ArrowUpRightIcon,
  BanknoteArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleDollarSignIcon,
  FileDownIcon,
  PackageOpenIcon,
  SendIcon,
  ShoppingBagIcon,
  WalletCardsIcon,
} from 'lucide-react';
import {type ReactNode, useCallback, useEffect, useState} from 'react';

type Product = {
  id: number;
  title: string;
  price_cents: number;
  currency: string;
  status: ProductStatus;
  rejection_reason?: string | null;
  files?: unknown[];
  files_count?: number;
};

type ProductStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'archived';

type Order = {
  id: number;
  status: string;
  created_at: string;
  gross_amount_cents?: number;
  gross_cents?: number;
  total_cents?: number;
  creator_earnings_cents?: number;
  creator_earnings?: number;
  items?: Array<{product?: {title?: string}; product_title?: string}>;
  product?: {title?: string};
};

type PayoutRequest = {
  id: number;
  amount_cents: number;
  status: 'pending' | 'paid' | 'rejected' | string;
  created_at: string;
};

type SalesSummary = {
  gross_sales_cents?: number;
  gross_cents?: number;
  creator_earnings_cents?: number;
  available_for_payout_cents?: number;
  paid_out_cents?: number;
  paid_balance_cents?: number;
  currency?: string;
};

type StorefrontData = {
  products: Product[];
  productsPagination: CollectionPagination;
  orders: Order[];
  payouts: PayoutRequest[];
  payoutsPagination: CollectionPagination;
  summary: SalesSummary;
};

type CollectionPagination = {
  currentPage: number;
  lastPage: number;
};

const initialData: StorefrontData = {
  products: [],
  productsPagination: {currentPage: 1, lastPage: 1},
  orders: [],
  payouts: [],
  payoutsPagination: {currentPage: 1, lastPage: 1},
  summary: {},
};

export function Component() {
  const [data, setData] = useState<StorefrontData>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [submittingId, setSubmittingId] = useState<number>();
  const [payoutAmount, setPayoutAmount] = useState('');
  const [isRequestingPayout, setIsRequestingPayout] = useState(false);
  const [productsPage, setProductsPage] = useState(1);
  const [payoutsPage, setPayoutsPage] = useState(1);

  const loadStorefront = useCallback(async () => {
    setIsLoading(true);
    setError(undefined);

    try {
      const [productsResponse, salesResponse, payoutsResponse] =
        await Promise.all([
          storefrontFetch(
            `/api/v1/storefront/products?page=${productsPage}`,
          ),
          storefrontFetch('/api/v1/storefront/sales'),
          storefrontFetch(
            `/api/v1/storefront/payout-requests?page=${payoutsPage}`,
          ),
        ]);

      const [products, sales, payouts] = await Promise.all(
        [productsResponse, salesResponse, payoutsResponse].map(response =>
          response.json(),
        ),
      );

      const productCollection = getCollectionResponse<Product>(products);
      const payoutCollection = getCollectionResponse<PayoutRequest>(payouts);

      setData({
        ...initialData,
        products: productCollection.data,
        productsPagination: productCollection.pagination,
        orders: getCollection<Order>(sales?.orders),
        payouts: payoutCollection.data,
        payoutsPagination: payoutCollection.pagination,
        summary: sales?.summary ?? {},
      });
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setIsLoading(false);
    }
  }, [productsPage, payoutsPage]);

  useEffect(() => {
    void loadStorefront();
  }, [loadStorefront]);

  const currency = data.summary.currency ?? data.products[0]?.currency ?? getSiteCurrency();
  const availableForPayout =
    data.summary.available_for_payout_cents ??
    data.summary.creator_earnings_cents ??
    0;
  const payoutAmountCents = Math.round(Number(payoutAmount) * 100);
  const canRequestPayout =
    payoutAmountCents > 0 && payoutAmountCents <= availableForPayout;

  const submitProduct = async (productId: number) => {
    setSubmittingId(productId);
    setError(undefined);

    try {
      await apiClient.post(`/api/v1/storefront/products/${productId}/submit`);
      await loadStorefront();
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setSubmittingId(undefined);
    }
  };

  const requestPayout = async () => {
    if (!canRequestPayout) return;

    setIsRequestingPayout(true);
    setError(undefined);
    try {
      await apiClient.post('/api/v1/storefront/payout-requests', {
        amount_cents: payoutAmountCents,
      });
      setPayoutAmount('');
      await loadStorefront();
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setIsRequestingPayout(false);
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <div className="min-w-0">
          <DashboardLayout.SectionTitle>
            <Trans message="Creator store" />
          </DashboardLayout.SectionTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <Trans message="Manage your digital products, earnings, and payouts." />
          </p>
        </div>
        <NewProductButton />
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-6">
          {error ? (
            <ErrorState message={error} onRetry={loadStorefront} />
          ) : null}

          <SummaryCards
            summary={data.summary}
            currency={currency}
            loading={isLoading}
          />

          <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(20rem,0.85fr)]">
            <ProductsPanel
              products={data.products}
              pagination={data.productsPagination}
              loading={isLoading}
              submittingId={submittingId}
              onSubmit={submitProduct}
              onPageChange={setProductsPage}
            />
            <PayoutRequestsPanel
              payouts={data.payouts}
              pagination={data.payoutsPagination}
              currency={currency}
              loading={isLoading}
              payoutAmount={payoutAmount}
              availableForPayout={availableForPayout}
              isRequesting={isRequestingPayout}
              canRequest={canRequestPayout}
              onAmountChange={setPayoutAmount}
              onRequest={requestPayout}
              onPageChange={setPayoutsPage}
            />
          </div>

          <RecentSalesPanel
            orders={data.orders}
            currency={currency}
            loading={isLoading}
          />
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function SummaryCards({
  summary,
  currency,
  loading,
}: {
  summary: SalesSummary;
  currency: string;
  loading: boolean;
}) {
  const cards = [
    {
      key: 'gross-sales',
      label: <Trans message="Gross sales" />,
      value: summary.gross_sales_cents ?? summary.gross_cents ?? 0,
      icon: <ShoppingBagIcon />,
      tone: 'text-primary bg-primary/10',
    },
    {
      key: 'creator-earnings',
      label: <Trans message="Creator earnings" />,
      value: summary.creator_earnings_cents ?? 0,
      icon: <CircleDollarSignIcon />,
      tone: 'text-positive bg-positive/10',
    },
    {
      key: 'available-for-payout',
      label: <Trans message="Available for payout" />,
      value:
        summary.available_for_payout_cents ??
        summary.creator_earnings_cents ??
        0,
      icon: <WalletCardsIcon />,
      tone: 'text-amber-600 bg-amber-500/10 dark:text-amber-400',
    },
    {
      key: 'paid-out',
      label: <Trans message="Paid out" />,
      value: summary.paid_out_cents ?? summary.paid_balance_cents ?? 0,
      icon: <BanknoteArrowUpIcon />,
      tone: 'text-muted-foreground bg-muted',
    },
  ];

  return (
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(card => (
        <Card.Root key={card.key} size="sm" className="gap-3">
          <Card.Content className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-medium text-muted-foreground">
                {card.label}
              </div>
              {loading ? (
                <Skeleton className="mt-2 h-8 w-28" />
              ) : (
                <div className="mt-1.5 truncate text-2xl font-semibold tracking-tight tabular-nums">
                  <FormattedCurrency
                    valueInCents={card.value}
                    currency={currency}
                  />
                </div>
              )}
            </div>
            <div
              className={`flex size-9 shrink-0 items-center justify-center rounded-card-sm [&>svg]:size-4 ${card.tone}`}
            >
              {card.icon}
            </div>
          </Card.Content>
        </Card.Root>
      ))}
    </section>
  );
}

function ProductsPanel({
  products,
  pagination,
  loading,
  submittingId,
  onSubmit,
  onPageChange,
}: {
  products: Product[];
  pagination: CollectionPagination;
  loading: boolean;
  submittingId?: number;
  onSubmit: (id: number) => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <Card.Root>
      <Card.Header className="border-b">
        <Card.Title>
          <Trans message="Products" />
        </Card.Title>
        <Card.Description>
          <Trans message="Only approved products can be sold on your biolink." />
        </Card.Description>
      </Card.Header>
      <Card.Content className="px-0">
        {loading ? (
          <LoadingRows rows={4} />
        ) : products.length ? (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head className="ps-6">
                  <Trans message="Product" />
                </Table.Head>
                <Table.Head>
                  <Trans message="Status" />
                </Table.Head>
                <Table.Head className="hidden text-end md:table-cell">
                  <Trans message="Price" />
                </Table.Head>
                <Table.Head className="hidden text-end lg:table-cell">
                  <Trans message="Files" />
                </Table.Head>
                <Table.Head className="pe-6" />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {products.map(product => (
                <Table.Row key={product.id}>
                  <Table.Cell className="max-w-44 ps-6 font-medium sm:max-w-xs">
                    <span className="block truncate">{product.title}</span>
                    {product.status === 'rejected' &&
                    product.rejection_reason ? (
                      <p className="mt-1 line-clamp-2 text-xs font-normal text-muted-foreground">
                        <Trans message="Review note:" /> {product.rejection_reason}
                      </p>
                    ) : null}
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground md:hidden">
                      <FormattedCurrency
                        valueInCents={product.price_cents}
                        currency={product.currency}
                      />
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <ProductStatusBadge status={product.status} />
                  </Table.Cell>
                  <Table.Cell className="hidden text-end md:table-cell">
                    <FormattedCurrency
                      valueInCents={product.price_cents}
                      currency={product.currency}
                    />
                  </Table.Cell>
                  <Table.Cell className="hidden text-end text-muted-foreground lg:table-cell">
                    {product.files_count ?? product.files?.length ?? 0}
                  </Table.Cell>
                  <Table.Cell className="pe-6 text-end">
                    {product.status === 'draft' ||
                    product.status === 'rejected' ? (
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={submittingId === product.id}
                        onClick={() => onSubmit(product.id)}
                      >
                        <SendIcon />
                        <Trans message="Submit" />
                      </Button>
                    ) : null}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        ) : (
          <ProductsEmptyState />
        )}
        {!loading && products.length ? (
          <CollectionPaginationControls
            pagination={pagination}
            onPageChange={onPageChange}
          />
        ) : null}
      </Card.Content>
    </Card.Root>
  );
}

function RecentSalesPanel({
  orders,
  currency,
  loading,
}: {
  orders: Order[];
  currency: string;
  loading: boolean;
}) {
  return (
    <Card.Root>
      <Card.Header className="border-b">
        <Card.Title>
          <Trans message="Recent sales" />
        </Card.Title>
        <Card.Description>
          <Trans message="Your latest completed customer orders." />
        </Card.Description>
      </Card.Header>
      <Card.Content className="px-0">
        {loading ? (
          <LoadingRows rows={3} />
        ) : orders.length ? (
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head className="ps-6">
                  <Trans message="Product" />
                </Table.Head>
                <Table.Head className="hidden text-end sm:table-cell">
                  <Trans message="Gross" />
                </Table.Head>
                <Table.Head className="text-end">
                  <Trans message="Your earnings" />
                </Table.Head>
                <Table.Head className="hidden md:table-cell">
                  <Trans message="Status" />
                </Table.Head>
                <Table.Head className="hidden pe-6 text-end lg:table-cell">
                  <Trans message="Date" />
                </Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {orders.slice(0, 8).map(order => (
                <Table.Row key={order.id}>
                  <Table.Cell className="max-w-48 ps-6 font-medium sm:max-w-sm">
                    <span className="block truncate">
                      {getOrderProductTitle(order)}
                    </span>
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground md:hidden">
                      <FormattedDate date={order.created_at} preset="short" />
                    </span>
                  </Table.Cell>
                  <Table.Cell className="hidden text-end sm:table-cell">
                    <FormattedCurrency
                      valueInCents={
                        order.gross_amount_cents ??
                        order.gross_cents ??
                        order.total_cents ??
                        0
                      }
                      currency={currency}
                    />
                  </Table.Cell>
                  <Table.Cell className="text-end font-medium text-positive">
                    <FormattedCurrency
                      valueInCents={
                        order.creator_earnings_cents ??
                        order.creator_earnings ??
                        0
                      }
                      currency={currency}
                    />
                  </Table.Cell>
                  <Table.Cell className="hidden md:table-cell">
                    <OrderStatusBadge status={order.status} />
                  </Table.Cell>
                  <Table.Cell className="hidden pe-6 text-end text-muted-foreground lg:table-cell">
                    <FormattedDate date={order.created_at} preset="short" />
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        ) : (
          <PanelEmptyState
            icon={<FileDownIcon />}
            message={
              <Trans message="Sales will appear here after your first paid order." />
            }
          />
        )}
      </Card.Content>
    </Card.Root>
  );
}

function PayoutRequestsPanel({
  payouts,
  pagination,
  currency,
  loading,
  payoutAmount,
  availableForPayout,
  isRequesting,
  canRequest,
  onAmountChange,
  onRequest,
  onPageChange,
}: {
  payouts: PayoutRequest[];
  pagination: CollectionPagination;
  currency: string;
  loading: boolean;
  payoutAmount: string;
  availableForPayout: number;
  isRequesting: boolean;
  canRequest: boolean;
  onAmountChange: (amount: string) => void;
  onRequest: () => void;
  onPageChange: (page: number) => void;
}) {
  return (
    <Card.Root>
      <Card.Header className="border-b">
        <Card.Title>
          <Trans message="Payout requests" />
        </Card.Title>
        <Card.Description>
          <Trans message="Request a manual transfer from your available earnings." />
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-5">
        <div className="rounded-card-sm border border-dashed bg-muted/40 p-4">
          <div className="text-xs font-medium text-muted-foreground">
            <Trans message="Available now" />
          </div>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-28" />
          ) : (
            <div className="mt-1 truncate text-2xl font-semibold tabular-nums">
              <FormattedCurrency
                valueInCents={availableForPayout}
                currency={currency}
              />
            </div>
          )}
          <div className="mt-3 flex gap-2">
            <Input
              aria-label={message('Payout amount')}
              bindToHookForm={false}
              inputMode="decimal"
              min="0.01"
              placeholder="0.00"
              type="number"
              value={payoutAmount}
              onChange={event => onAmountChange(event.target.value)}
              disabled={loading || isRequesting}
            />
            <Button disabled={!canRequest || isRequesting} onClick={onRequest}>
              <ArrowUpRightIcon />
              <Trans message="Request" />
            </Button>
          </div>
          {payoutAmount && !canRequest ? (
            <p className="mt-2 text-xs text-destructive">
              <Trans message="Enter an amount within your available balance." />
            </p>
          ) : null}
        </div>

        {loading ? (
          <LoadingRows rows={3} compact />
        ) : payouts.length ? (
          <div className="divide-y rounded-card-sm border">
            {payouts.slice(0, 5).map(payout => (
              <div
                key={payout.id}
                className="flex items-center justify-between gap-3 px-3 py-3"
              >
                <div>
                  <div className="font-medium">
                    <FormattedCurrency
                      valueInCents={payout.amount_cents}
                      currency={currency}
                    />
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    <FormattedDate date={payout.created_at} preset="short" />
                  </div>
                </div>
                <PayoutStatusBadge status={payout.status} />
              </div>
            ))}
          </div>
        ) : (
          <PanelEmptyState
            icon={<BanknoteArrowUpIcon />}
            message={<Trans message="No payout requests yet." />}
            compact
          />
        )}
        {!loading && payouts.length ? (
          <CollectionPaginationControls
            pagination={pagination}
            onPageChange={onPageChange}
          />
        ) : null}
      </Card.Content>
    </Card.Root>
  );
}

function NewProductButton() {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={<span className="ml-auto" />}>
        <Button disabled>
          <PackageOpenIcon />
          <Trans message="New product" />
        </Button>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <Trans message="Product creation form is coming next." />
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

function ProductsEmptyState() {
  return (
    <Empty.Root className="py-11">
      <Empty.Header>
        <Empty.Media variant="icon">
          <PackageOpenIcon />
        </Empty.Media>
        <Empty.Title>
          <Trans message="No products yet" />
        </Empty.Title>
        <Empty.Description>
          <Trans message="Your digital products will appear here once you create them." />
        </Empty.Description>
      </Empty.Header>
    </Empty.Root>
  );
}

function PanelEmptyState({
  icon,
  message,
  compact = false,
}: {
  icon: ReactNode;
  message: ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center text-muted-foreground ${compact ? 'py-4' : 'py-10'}`}
    >
      <div className="mb-2 flex size-8 items-center justify-center rounded-card-sm bg-muted">
        {icon}
      </div>
      <p className="max-w-xs text-sm">{message}</p>
    </div>
  );
}

function CollectionPaginationControls({
  pagination,
  onPageChange,
}: {
  pagination: CollectionPagination;
  onPageChange: (page: number) => void;
}) {
  if (pagination.lastPage <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-6 pt-4">
      <div className="text-xs text-muted-foreground">
        <Trans
          message="Page :current of :total"
          values={{
            current: pagination.currentPage,
            total: pagination.lastPage,
          }}
        />
      </div>
      <div className="flex items-center gap-1">
        <Button
          aria-label={message('Previous page')}
          color="default"
          disabled={pagination.currentPage <= 1}
          size="icon-xs"
          variant="outline"
          onClick={() => onPageChange(pagination.currentPage - 1)}
        >
          <ChevronLeftIcon />
        </Button>
        <Button
          aria-label={message('Next page')}
          color="default"
          disabled={pagination.currentPage >= pagination.lastPage}
          size="icon-xs"
          variant="outline"
          onClick={() => onPageChange(pagination.currentPage + 1)}
        >
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}

function LoadingRows({
  rows,
  compact = false,
}: {
  rows: number;
  compact?: boolean;
}) {
  return (
    <div className={compact ? 'flex flex-col gap-3' : 'divide-y'}>
      {Array.from({length: rows}, (_, index) => (
        <div
          key={index}
          className={
            compact
              ? 'flex items-center justify-between'
              : 'flex items-center gap-4 px-6 py-4'
          }
        >
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="ml-auto h-4 w-16" />
          {!compact ? <Skeleton className="hidden h-4 w-12 sm:block" /> : null}
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-card-sm border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      <span>{message}</span>
      <Button size="xs" variant="outline" color="default" onClick={onRetry}>
        <Trans message="Try again" />
      </Button>
    </div>
  );
}

function ProductStatusBadge({status}: {status: ProductStatus}) {
  const config: Record<
    ProductStatus,
    {
      label: ReactNode;
      variant: 'secondary' | 'positive' | 'destructive' | 'outline';
    }
  > = {
    draft: {label: <Trans message="Draft" />, variant: 'outline'},
    pending_approval: {
      label: <Trans message="In review" />,
      variant: 'secondary',
    },
    approved: {label: <Trans message="Approved" />, variant: 'positive'},
    rejected: {
      label: <Trans message="Needs changes" />,
      variant: 'destructive',
    },
    archived: {label: <Trans message="Archived" />, variant: 'secondary'},
  };
  return <Badge variant={config[status].variant}>{config[status].label}</Badge>;
}

function OrderStatusBadge({status}: {status: string}) {
  return status === 'paid' || status === 'completed' ? (
    <Badge variant="positive">
      <Trans message="Paid" />
    </Badge>
  ) : (
    <Badge variant="secondary">{getOrderStatusLabel(status)}</Badge>
  );
}

function PayoutStatusBadge({status}: {status: string}) {
  if (status === 'paid')
    return (
      <Badge variant="positive">
        <Trans message="Paid" />
      </Badge>
    );
  if (status === 'rejected')
    return (
      <Badge variant="destructive">
        <Trans message="Rejected" />
      </Badge>
    );
  return (
    <Badge variant="secondary">
      <Trans message="Pending" />
    </Badge>
  );
}

async function storefrontFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(init?.body ? {'Content-Type': 'application/json'} : {}),
      ...init?.headers,
    },
    ...init,
  });
  if (response.ok) return response;

  let errorMessage = message('Unable to load storefront data.');
  try {
    const body = await response.json();
    errorMessage = body.message ?? errorMessage;
  } catch {
    // Use the fallback when the response is not JSON.
  }
  throw new Error(errorMessage);
}

function getCollection<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (
    value &&
    typeof value === 'object' &&
    Array.isArray((value as {data?: unknown[]}).data)
  ) {
    return (value as {data: T[]}).data;
  }
  return [];
}

function getCollectionResponse<T>(value: unknown): {
  data: T[];
  pagination: CollectionPagination;
} {
  const collection = getCollection<T>(value);
  const meta =
    value && typeof value === 'object'
      ? (value as {meta?: {current_page?: number; last_page?: number}}).meta
      : undefined;

  return {
    data: collection,
    pagination: {
      currentPage: meta?.current_page ?? 1,
      lastPage: meta?.last_page ?? 1,
    },
  };
}

function getOrderProductTitle(order: Order): ReactNode {
  return (
    order.items?.[0]?.product?.title ??
    order.items?.[0]?.product_title ??
    order.product?.title ??
    <Trans message="Product no longer available" />
  );
}

function getOrderStatusLabel(status: string): ReactNode {
  switch (status) {
    case 'pending':
      return <Trans message="Pending" />;
    case 'failed':
      return <Trans message="Failed" />;
    case 'cancelled':
      return <Trans message="Cancelled" />;
    case 'refunded':
      return <Trans message="Refunded" />;
    default:
      return <Trans message="Unknown status" />;
  }
}

function getErrorMessage(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : message('Unable to load storefront data.');
}


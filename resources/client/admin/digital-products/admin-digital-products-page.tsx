import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Popover} from '@shadcn/popover/popover';
import {Select} from '@shadcn/forms/select/select';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {
  BadgeCheckIcon,
  CheckIcon,
  CircleQuestionMarkIcon,
  ClockIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  FileIcon,
  HashIcon,
  LandmarkIcon,
  SearchIcon,
  ShieldCheckIcon,
  StarIcon,
  XCircleIcon,
  XIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Link, useNavigate} from 'react-router';

const ProductStatus = {
  pending_approval: 'pending_approval',
  approved: 'approved',
  rejected: 'rejected',
} as const;

type ProductStatus = (typeof ProductStatus)[keyof typeof ProductStatus] | '';

type Product = {
  id: number;
  title: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  status: ProductStatus;
  rejection_reason?: string | null;
  created_at?: string;
  creator?: {name: string; email: string};
  cover?: {url: string} | null;
  files?: Array<{id: number; name: string}>;
  biolinks?: Array<{name: string}>;
  reviews_count?: number;
  hidden_reviews_count?: number;
};

type PaginationLinks = Record<string, string | null>;
type PaginationMeta = {
  current_page: number;
  last_page: number;
  total: number;
};

type CountersMeta = {
  counters: {
    pending_approval: {total: number};
    approved: {total: number};
    rejected: {total: number};
  };
};

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

function formatDate(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function looksLikeHtml(value: string) {
  return /<[a-z][\s\S]*>/i.test(value);
}

export function Component() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<ProductStatus | ''>('');

  const statusLabels = {
    '': <Trans message="All statuses" />,
    pending_approval: 'Pending',
    approved: 'Approved',
    rejected: 'Rejected',
  } as const;

  const [links, setLinks] = useState<PaginationLinks>();
  const [meta, setMeta] = useState<PaginationMeta & CountersMeta>();
  const [currentPage, setCurrentPage] = useState(1);

  const [selected, setSelected] = useState<Product>();
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (page: number = currentPage) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({perPage: '15'});
        if (search) params.set('search', search);
        if (status) params.set('status', status);
        if (page > 1) params.set('page', String(page));

        const response = await apiClient.get(
          `/api/v1/admin/digital-products?${params.toString()}`,
        );
        setProducts(response.data.data ?? []);
        setLinks(response.data.links ?? {});
        setMeta({
          ...response.data.meta,
          counters: response.data.meta?.counters ?? {
            pending_approval: {total: 0},
            approved: {total: 0},
            rejected: {total: 0},
          },
        });
        setCurrentPage(response.data.meta?.current_page ?? 1);
        setError(undefined);
      } catch {
        setError('Unable to load digital products.');
      } finally {
        setLoading(false);
      }
    },
    [search, status, currentPage],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const applyFilters = () => {
    setSearch(searchInput);
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setCurrentPage(1);
  };

  const approve = async (product: Product) => {
    setSaving(true);
    try {
      await apiClient.post(
        `/api/v1/admin/digital-products/${product.id}/approve`,
      );
      setSelected(undefined);
      await load();
    } catch {
      setError('Unable to approve product.');
    } finally {
      setSaving(false);
    }
  };

  const reject = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiClient.post(
        `/api/v1/admin/digital-products/${selected.id}/reject`,
        {reason: reason.trim() || null},
      );
      setSelected(undefined);
      setReason('');
      await load();
    } catch {
      setError('Unable to reject product.');
    } finally {
      setSaving(false);
    }
  };

  const counters = meta?.counters;

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Digital Products" />
          <InfoTrigger />
        </DashboardLayout.SectionTitle>
        <Button
          variant="outline"
          nativeButton={false}
          render={<Link to="/admin/digital-products/payouts" />}
        >
          <LandmarkIcon />
          <Trans message="Payout requests" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl py-6">
          {error && (
            <div className="mb-5 rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <CounterCard
              title="Pending"
              count={counters?.pending_approval?.total ?? 0}
              icon={<ClockIcon className="size-6" />}
              tone="amber"
            />
            <CounterCard
              title="Approved"
              count={counters?.approved?.total ?? 0}
              icon={<BadgeCheckIcon className="size-6" />}
              tone="green"
            />
            <CounterCard
              title="Rejected"
              count={counters?.rejected?.total ?? 0}
              icon={<XCircleIcon className="size-6" />}
              tone="red"
            />
          </div>

          <Card.Root>
            <div className="border-b p-4">
              <form
                className="grid grid-cols-1 gap-3 sm:grid-cols-12"
                onSubmit={e => {
                  e.preventDefault();
                  applyFilters();
                }}
              >
                <div className="sm:col-span-6">
                  <Input
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                    placeholder="Search…"
                  />
                </div>
                <div className="sm:col-span-3">
                  <Select.Root
                    value={status}
                    onValueChange={value => setStatus((value as ProductStatus) || '')}
                  >
                     <Select.Trigger>
                      <Select.Value placeholder={<Trans message="Status" />}>
                        {value => statusLabels[value as keyof typeof statusLabels] ?? <Trans message="Status" />}
                      </Select.Value>
                    </Select.Trigger>
                    <Select.Content>
                      <Select.Item value="">
                        <Trans message="All statuses" />
                      </Select.Item>
                      <Select.Item value="pending_approval">
                        <Trans message="Pending" />
                      </Select.Item>
                      <Select.Item value="approved">
                        <Trans message="Approved" />
                      </Select.Item>
                      <Select.Item value="rejected">
                        <Trans message="Rejected" />
                      </Select.Item>
                    </Select.Content>
                  </Select.Root>
                </div>
                <div className="flex gap-2 sm:col-span-3">
                  <Button type="submit" className="flex-1">
                    <SearchIcon />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={resetFilters}
                  >
                    <Trans message="Reset" />
                  </Button>
                </div>
              </form>
            </div>
            <div className="overflow-x-auto">
              <Table.Root>
                <Table.Header>
                  <Table.Row>
                    <Table.Head>
                      <Trans message="ID" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Product" />
                    </Table.Head>
                    <Table.Head>
                      <Trans message="Creator" />
                    </Table.Head>
                    <Table.Head className="text-center">
                      <Trans message="Price" />
                    </Table.Head>
                    <Table.Head className="text-center">
                      <Trans message="Status" />
                    </Table.Head>
                    <Table.Head className="text-center">
                      <Trans message="Reviews" />
                    </Table.Head>
                    <Table.Head className="text-center">
                      <Trans message="Submitted Date" />
                    </Table.Head>
                    <Table.Head />
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {loading ? (
                    <Table.Row>
                      <Table.Cell
                        colSpan={8}
                        className="h-28 text-center text-muted-foreground"
                      >
                        <Trans message="Loading…" />
                      </Table.Cell>
                    </Table.Row>
                  ) : products.length ? (
                    products.map(product => (
                      <Table.Row key={product.id}>
                        <Table.Cell>
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 text-foreground hover:underline"
                            onClick={() => setSelected(product)}
                          >
                            <HashIcon className="size-3.5 text-muted-foreground" />
                            <span>{product.id}</span>
                          </button>
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex items-center gap-3">
                            {product.cover?.url ? (
                              <img
                                className="size-10 rounded-input object-cover"
                                src={product.cover.url}
                                alt=""
                              />
                            ) : (
                              <div className="flex size-10 items-center justify-center rounded-input bg-muted">
                                <FileIcon className="size-4" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{product.title}</p>
                              <p className="text-xs text-muted-foreground">
                                <Trans
                                  message=":count files"
                                  values={{count: product.files?.length ?? 0}}
                                />
                              </p>
                            </div>
                          </div>
                        </Table.Cell>
                        <Table.Cell>
                          <p className="text-sm">{product.creator?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {product.creator?.email}
                          </p>
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          {formatMoney(product.price_cents, product.currency)}
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          <StatusBadge status={product.status} />
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 text-foreground">
                              <StarIcon className="size-3.5 text-amber-500" />
                              {product.reviews_count ?? 0}
                            </span>
                            {(product.hidden_reviews_count ?? 0) > 0 && (
                              <span className="text-xs text-muted-foreground">
                                <Trans
                                  message=":count hidden"
                                  values={{count: product.hidden_reviews_count}}
                                />
                              </span>
                            )}
                          </div>
                        </Table.Cell>
                        <Table.Cell className="text-center">
                          {formatDate(product.created_at)}
                        </Table.Cell>
                        <Table.Cell>
                          <div className="flex justify-end">
                            <Dropdown>
                              <Dropdown.Trigger
                                className="flex size-8 items-center justify-center rounded-input hover:bg-muted"
                                aria-label="Actions"
                              >
                                <EllipsisVerticalIcon className="size-4 text-muted-foreground" />
                              </Dropdown.Trigger>
                              <Dropdown.Content align="end">
                                <Dropdown.Item
                                  onClick={() => setSelected(product)}
                                >
                                  <EyeIcon />
                                  <Trans message="Details" />
                                </Dropdown.Item>
                                <Dropdown.Item
                                  onClick={() =>
                                    navigate(
                                      `/admin/digital-products/${product.id}/reviews`,
                                    )
                                  }
                                >
                                  <StarIcon />
                                  <Trans message="Reviews" />
                                </Dropdown.Item>
                              </Dropdown.Content>
                            </Dropdown>
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    ))
                  ) : (
                    <Table.Row>
                      <Table.Cell
                        colSpan={8}
                        className="h-28 text-center text-muted-foreground"
                      >
                        <Trans message="No products found." />
                      </Table.Cell>
                    </Table.Row>
                  )}
                </Table.Body>
              </Table.Root>
            </div>
            {meta && meta.last_page > 1 && (
              <div className="flex items-center justify-between border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  <Trans
                    message="Showing :from - :to of :total"
                    values={{
                      from: (meta.current_page - 1) * 15 + 1,
                      to: Math.min(meta.current_page * 15, meta.total),
                      total: meta.total,
                    }}
                  />
                </p>
                <div className="flex gap-1">
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={!links?.prev}
                    onClick={() => {
                      if (links?.prev) void load(currentPage - 1);
                    }}
                  >
                    <Trans message="Previous" />
                  </Button>
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={!links?.next}
                    onClick={() => {
                      if (links?.next) void load(currentPage + 1);
                    }}
                  >
                    <Trans message="Next" />
                  </Button>
                </div>
              </div>
            )}
          </Card.Root>
        </div>
      </DashboardLayout.SectionContent>

      {selected && (
        <Dialog.Root
          open
          onOpenChange={open => !open && setSelected(undefined)}
        >
          <Dialog.Portal>
            <Dialog.Backdrop />
            <Dialog.Content className="sm:max-w-lg">
              <Dialog.Header>
                <Dialog.Title>
                  <ShieldCheckIcon />
                  <Trans message="Review digital product" />
                </Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <div className="space-y-4">
                  <div>
                    <p className="font-semibold">{selected.title}</p>
                    {selected.description &&
                    looksLikeHtml(selected.description) ? (
                      <div
                        className="prose prose-sm mt-1 max-h-64 max-w-none overflow-y-auto text-muted-foreground dark:prose-invert"
                        dangerouslySetInnerHTML={{__html: selected.description}}
                      />
                    ) : (
                      <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                        {selected.description}
                      </p>
                    )}
                  </div>
                  <div className="rounded-input bg-muted p-3 text-sm">
                    <p>
                      <Trans
                        message="Creator: :name"
                        values={{name: selected.creator?.name ?? '—'}}
                      />
                    </p>
                    <p className="mt-1">
                      <Trans
                        message="Files: :count"
                        values={{count: selected.files?.length ?? 0}}
                      />
                    </p>
                  </div>
                  {selected.status === 'rejected' &&
                    selected.rejection_reason && (
                      <p className="rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                        <Trans
                          message="Previously rejected: :reason"
                          values={{reason: selected.rejection_reason}}
                        />
                      </p>
                    )}
                  {selected.status === 'pending_approval' && (
                    <Field.Root>
                      <Field.Label>
                        <Trans message="Rejection reason (optional)" />
                      </Field.Label>
                      <Textarea
                        rows={4}
                        value={reason}
                        onChange={e => setReason(e.target.value)}
                        placeholder="Explain what the creator should change."
                      />
                    </Field.Root>
                  )}
                </div>
              </Dialog.Body>
              <Dialog.Footer>
                <Button
                  variant="outline"
                  onClick={() => setSelected(undefined)}
                  disabled={saving}
                >
                  <Trans message="Close" />
                </Button>
                {selected.status === 'pending_approval' && (
                  <>
                    <Button
                      color="danger"
                      variant="outline"
                      disabled={saving}
                      onClick={() => void reject()}
                    >
                      <XIcon />
                      <Trans message="Reject" />
                    </Button>
                    <Button
                      disabled={saving}
                      onClick={() => void approve(selected)}
                    >
                      <CheckIcon />
                      <Trans message="Approve" />
                    </Button>
                  </>
                )}
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}
    </DashboardLayout.MainSection>
  );
}

function CounterCard({
  title,
  count,
  icon,
  tone,
}: {
  title: string;
  count: number;
  icon: React.ReactNode;
  tone: 'amber' | 'green' | 'red';
}) {
  const tones: Record<string, string> = {
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    red: 'border-red-200 bg-red-50 text-red-700',
  };
  const iconTones: Record<string, string> = {
    amber: 'text-amber-500',
    green: 'text-emerald-500',
    red: 'text-red-500',
  };
  return (
    <div
      className={`relative overflow-hidden rounded-card border p-5 ${tones[tone]}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium opacity-80">{title}</p>
          <p className="mt-1 text-3xl font-bold text-foreground">{count}</p>
        </div>
        <div className={iconTones[tone]}>{icon}</div>
      </div>
    </div>
  );
}

function StatusBadge({status}: {status: ProductStatus}) {
  if (status === 'approved') {
    return (
      <Badge variant="positive">
        <BadgeCheckIcon />
        <Trans message="Approved" />
      </Badge>
    );
  }
  if (status === 'rejected') {
    return (
      <Badge variant="destructive">
        <XCircleIcon />
        <Trans message="Rejected" />
      </Badge>
    );
  }
  return (
    <Badge variant="outline">
      <ClockIcon />
      <Trans message="Pending" />
    </Badge>
  );
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
          <Trans message="Review creator products before they can be sold on bio pages. Approve or reject submissions." />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

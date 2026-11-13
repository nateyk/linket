import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Empty} from '@shadcn/empty/empty';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {formatMoney} from '@ui/i18n/format-money';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {toast} from '@ui/toast/toast';
import useClipboard from '@ui/utils/hooks/use-clipboard';
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  BarChart3Icon,
  ChartNoAxesCombinedIcon,
  CheckIcon,
  CircleAlertIcon,
  CopyIcon,
  CopyPlusIcon,
  ExternalLinkIcon,
  GraduationCapIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PackagePlusIcon,
  ShoppingBagIcon,
  PencilIcon,
  SendIcon,
  StarIcon,
  StoreIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Link} from 'react-router';
import {CreatorListingToolbar} from '@app/dashboard/creator-listing-toolbar';
import {CreateProductDialog} from './create-product-dialog';

type ProductStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'archived';

type ProductBiolink = {
  id: number;
  name: string;
  short_url: string;
};

type Product = {
  id: number;
  title: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  type?: string;
  is_course?: boolean;
  status: ProductStatus;
  rejection_reason?: string | null;
  review_requested_at?: string | null;
  has_pending_update?: boolean;
  sales_count: number;
  gross_revenue_cents: number;
  cover?: {url: string} | null;
  files?: unknown[];
  biolinks?: ProductBiolink[];
  course?: {id: number} | null;
};

type ProductsResponse = {
  data?: Product[];
  meta?: {
    current_page?: number;
    last_page?: number;
    total?: number;
    per_page?: number;
  };
};

export function Component() {
  const {trans} = useTrans();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [submittingId, setSubmittingId] = useState<number>();
  const [busyId, setBusyId] = useState<number>();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('latest');
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const response = await apiClient.get('/api/v1/items', {
        params: {
          page,
          per_page: 12,
          search: search.trim() || undefined,
          status: status || undefined,
          sort: sort || undefined,
        },
      });
      const payload: ProductsResponse = response.data;
      setProducts(payload.data ?? []);
      setLastPage(payload.meta?.last_page ?? 1);
    } catch (reason) {
      setError(
        getApiErrorMessage(reason) ||
          trans({message: 'Unable to load digital products.'}),
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, sort, status, trans]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (product: Product) => {
    setSubmittingId(product.id);
    setError(undefined);

    try {
      await apiClient.post(`/api/v1/items/${product.id}/submit`);
      toast.positive(message('Product submitted for review'));
      await load();
    } catch (reason) {
      setError(
        getApiErrorMessage(reason) ||
          trans({message: 'Unable to submit product.'}),
      );
    } finally {
      setSubmittingId(undefined);
    }
  };

  const duplicate = async (product: Product) => {
    setBusyId(product.id);
    setError(undefined);
    try {
      await apiClient.post(`/api/v1/items/${product.id}/duplicate`);
      toast.positive(message('Product duplicated as a draft'));
      setPage(1);
      await load();
    } catch (reason) {
      setError(
        getApiErrorMessage(reason) ||
          trans({message: 'Unable to duplicate product.'}),
      );
    } finally {
      setBusyId(undefined);
    }
  };

  const archive = async (product: Product) => {
    setBusyId(product.id);
    setError(undefined);
    try {
      await apiClient.post(`/api/v1/items/${product.id}/archive`);
      toast.positive(message('Product archived'));
      await load();
    } catch (reason) {
      setError(
        getApiErrorMessage(reason) ||
          trans({message: 'Unable to archive product.'}),
      );
    } finally {
      setBusyId(undefined);
    }
  };

  const unarchive = async (product: Product) => {
    setBusyId(product.id);
    setError(undefined);
    try {
      await apiClient.post(`/api/v1/items/${product.id}/unarchive`);
      toast.positive(message('Product restored to draft'));
      await load();
    } catch (reason) {
      setError(
        getApiErrorMessage(reason) ||
          trans({message: 'Unable to restore product.'}),
      );
    } finally {
      setBusyId(undefined);
    }
  };

  const remove = async (product: Product): Promise<boolean> => {
    setBusyId(product.id);
    setError(undefined);

    try {
      await apiClient.delete(`/api/v1/items/${product.id}`);
      toast.positive(message('Product deleted'));
      await load();
      return true;
    } catch (reason) {
      setError(
        getApiErrorMessage(reason) ||
          trans({message: 'Unable to delete product.'}),
      );
      return false;
    } finally {
      setBusyId(undefined);
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle render={<h1 />}>
          <Trans message="My Items" />
        </DashboardLayout.SectionTitle>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PackagePlusIcon />
          <Trans message="New product" />
        </Button>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-1 py-4 sm:px-0">
          {error && <ErrorNotice message={error} onRetry={() => void load()} />}

          <CreatorListingToolbar
            search={search}
            searchLabel={trans({message: 'Search products'})}
            onSearchChange={value => {
              setSearch(value);
              setPage(1);
            }}
            status={status}
            onStatusChange={value => {
              setStatus(value);
              setPage(1);
            }}
            statusOptions={[
              {value: 'draft', label: <Trans message="Draft" />},
              {value: 'pending_approval', label: <Trans message="In review" />},
              {value: 'approved', label: <Trans message="Live" />},
              {value: 'rejected', label: <Trans message="Needs changes" />},
              {value: 'archived', label: <Trans message="Archived" />},
            ]}
            sort={sort}
            onSortChange={value => {
              setSort(value);
              setPage(1);
            }}
            sortOptions={[
              {value: 'latest', label: <Trans message="Newest" />},
              {value: 'oldest', label: <Trans message="Oldest" />},
              {value: 'title', label: <Trans message="Title" />},
              {value: '-sales', label: <Trans message="Most sales" />},
              {value: '-revenue', label: <Trans message="Highest revenue" />},
            ]}
            onClear={() => {
              setSearch('');
              setStatus('');
              setSort('latest');
              setPage(1);
            }}
          />

          {loading ? (
            <ProductSkeleton />
          ) : products.length ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-5">
                {products.map(product => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    submitting={submittingId === product.id}
                    busy={busyId === product.id}
                    onSubmit={() => void submit(product)}
                    onDuplicate={() => void duplicate(product)}
                    onArchive={() => void archive(product)}
                    onUnarchive={() => void unarchive(product)}
                    onDelete={() => remove(product)}
                  />
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(current => Math.max(1, current - 1))}
                >
                  <Trans message="Previous" />
                </Button>
                <p className="text-sm text-muted-foreground">
                  <Trans
                    message="Page :page of :last"
                    values={{page, last: lastPage}}
                  />
                </p>
                <Button
                  variant="outline"
                  disabled={page >= lastPage || loading}
                  onClick={() => setPage(current => current + 1)}
                >
                  <Trans message="Next" />
                </Button>
              </div>
            </>
          ) : search.trim() || status ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-card-sm border border-dashed p-6 text-center" role="status">
              <p className="text-sm font-medium"><Trans message="No matching products" /></p>
            </div>
          ) : (
            <EmptyProducts onNewProduct={() => setCreateDialogOpen(true)} />
          )}
        </div>
      </DashboardLayout.SectionContent>

      <CreateProductDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
    </DashboardLayout.MainSection>
  );
}

function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="mb-5 flex items-center gap-3 rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
    >
      <CircleAlertIcon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
      <Button size="sm" variant="outline" color="danger" onClick={onRetry}>
        <Trans message="Retry" />
      </Button>
    </div>
  );
}

function ProductCard({
  product,
  submitting,
  busy,
  onSubmit,
  onDuplicate,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  product: Product;
  submitting: boolean;
  busy: boolean;
  onSubmit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => Promise<boolean>;
}) {
  const {trans} = useTrans();
  const canSubmit = product.status === 'draft' || product.status === 'rejected';
  const primaryBiolink = product.biolinks?.[0];
  const publicUrl = primaryBiolink
    ? productPublicUrl(product, primaryBiolink)
    : '';
  const [isCopied, copyToClipboard] = useClipboard(publicUrl);

  const copyPublicUrl = () => {
    copyToClipboard();
    toast.positive(message('Product link copied'));
  };
  const isCourse = product.type === 'course' || product.is_course;
  const editPath = isCourse ? `/dashboard/items/${product.id}/course` : `/dashboard/items/${product.id}/edit`;

  return (
    <Card.Root className="group flex h-full flex-col gap-0 overflow-hidden py-0 ring-1 ring-foreground/10 transition-shadow hover:shadow-sm">
      <Card.Header className="relative block p-0">
        <Link
          to={editPath}
          className="block aspect-video overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          {product.cover?.url ? (
            <img
              className="size-full object-cover"
              src={product.cover.url}
              loading="lazy"
              decoding="async"
              alt={trans({
                message: ':title product cover',
                values: {title: product.title},
              })}
            />
          ) : (
            <ProductCoverFallback />
          )}
        </Link>
        <div className="absolute top-3 left-3">
          <StatusBadge
            status={product.status}
            hasPendingUpdate={product.has_pending_update}
          />
        </div>
      </Card.Header>

      <Card.Content className="flex flex-1 flex-col gap-3 p-4 pb-0">
        <div className="flex min-w-0 flex-col gap-1">
          {isCourse && (
            <span className="truncate text-xs font-medium text-muted-foreground">
              <Trans message="Course" />
            </span>
          )}
          <Card.Title className="truncate text-sm font-semibold leading-5">
            <Link
              to={editPath}
              className="hover:underline hover:underline-offset-3"
            >
              {product.title}
            </Link>
          </Card.Title>
        </div>

        <div className="text-xs font-medium text-muted-foreground">
          {product.price_cents === 0 ? (
            <Trans message="Free access" />
          ) : (
            <FormattedCurrency
              valueInCents={product.price_cents}
              currency={product.currency.toUpperCase()}
            />
          )}
        </div>

        {(product.status === 'rejected' || product.status === 'pending_approval') && product.rejection_reason && (
          <div className="flex gap-2 rounded-card-sm bg-destructive/8 p-2.5 text-xs leading-4 text-destructive">
            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
            <span className="line-clamp-2">{product.rejection_reason}</span>
          </div>
        )}
      </Card.Content>

      <Card.Footer className="justify-between gap-3 px-4 py-4">
        <div className="flex min-w-0 flex-col gap-0.5 text-sm text-muted-foreground">
          <div className="flex min-w-0 items-center gap-2">
            <ShoppingBagIcon className="size-4 shrink-0" aria-hidden="true" />
            <SalesLabel count={product.sales_count} />
          </div>
          {product.sales_count > 0 && (
            <span className="truncate">
              <Trans
                message=":amount earned"
                values={{
                  amount: formatMoney(
                    product.gross_revenue_cents,
                    product.currency.toUpperCase(),
                  ),
                }}
              />
            </span>
          )}
        </div>

        <Tooltip.Provider>
          <div className="flex items-center gap-1">
            {primaryBiolink && product.status === 'approved' && (
              <>
                <Tooltip.Root>
                  <Tooltip.Trigger
                    render={
                      <Button
                        aria-label={trans({
                          message: 'Copy link for :page',
                          values: {page: primaryBiolink.name},
                        })}
                        size="icon-sm"
                        variant="ghost"
                        onClick={copyPublicUrl}
                      >
                        {isCopied ? <CheckIcon /> : <CopyIcon />}
                      </Button>
                    }
                  />
                  <Tooltip.Content>
                    <Trans
                      message="Copy link for :page"
                      values={{page: primaryBiolink.name}}
                    />
                  </Tooltip.Content>
                </Tooltip.Root>
                <Tooltip.Root>
                  <Tooltip.Trigger
                    render={
                      <Button
                        aria-label={trans({message: 'Open product page'})}
                        size="icon-sm"
                        variant="ghost"
                        nativeButton={false}
                        render={
                          <a
                            href={publicUrl}
                            target="_blank"
                            rel="noreferrer"
                          />
                        }
                      >
                        <ExternalLinkIcon />
                      </Button>
                    }
                  />
                  <Tooltip.Content>
                    <Trans message="Open product page" />
                  </Tooltip.Content>
                </Tooltip.Root>
              </>
            )}

            <ProductActions
              product={product}
              canSubmit={canSubmit}
              submitting={submitting}
              busy={busy}
              onSubmit={onSubmit}
              onDuplicate={onDuplicate}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
              onDelete={onDelete}
            />
          </div>
        </Tooltip.Provider>
      </Card.Footer>
    </Card.Root>
  );
}

function SalesLabel({count}: {count: number}) {
  return count === 1 ? (
    <Trans message=":count sale" values={{count}} />
  ) : (
    <Trans message=":count sales" values={{count}} />
  );
}

function ProductActions({
  product,
  canSubmit,
  submitting,
  busy,
  onSubmit,
  onDuplicate,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  product: Product;
  canSubmit: boolean;
  submitting: boolean;
  busy: boolean;
  onSubmit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => Promise<boolean>;
}) {
  const {trans} = useTrans();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const isCourse = product.type === 'course' || product.is_course;
  const hasSales = product.sales_count > 0;

  return (
    <>
      <Dropdown.Root>
        <Dropdown.Trigger
          aria-label={trans({message: 'More product actions'})}
          render={<Button variant="ghost" size="icon-sm" />}
        >
          <MoreHorizontalIcon />
        </Dropdown.Trigger>
        <Dropdown.Content align="end" alignOffset={-4} sideOffset={8}>
          {!(product.type === 'course' || product.is_course) && (
            <Dropdown.LinkItem render={<Link to={`/dashboard/items/${product.id}/edit`} />}>
              <PencilIcon />
              <Trans message="Edit product" />
            </Dropdown.LinkItem>
          )}
          {(product.type === 'course' || product.is_course) && (
            <Dropdown.LinkItem render={<Link to={`/dashboard/items/${product.id}/course`} />}>
              <GraduationCapIcon />
              <Trans message="Open course builder" />
            </Dropdown.LinkItem>
          )}

          {(product.type === 'course' || product.is_course) && (
            <Dropdown.LinkItem render={<Link to={`/dashboard/items/${product.id}/course/analytics`} />}>
              <BarChart3Icon />
              <Trans message="Analytics" />
            </Dropdown.LinkItem>
          )}

          <Dropdown.LinkItem render={<Link to={`/dashboard/items/${product.id}/statistics`} />}>
            <ChartNoAxesCombinedIcon />
            <Trans message="Statistics" />
          </Dropdown.LinkItem>

          {canSubmit && (
            <Dropdown.Item
              disabled={submitting || busy || (!isCourse && !product.files?.length)}
              onClick={onSubmit}
            >
              <SendIcon />
              {submitting ? (
                <Trans message="Submitting..." />
              ) : product.status === 'rejected' ? (
                <Trans message="Resubmit for review" />
              ) : (
                <Trans message="Submit for review" />
              )}
            </Dropdown.Item>
          )}

          <Dropdown.Item disabled={busy} onClick={onDuplicate}>
            <CopyPlusIcon />
            <Trans message="Duplicate" />
          </Dropdown.Item>

          {product.status === 'archived' ? (
            <Dropdown.Item disabled={busy} onClick={onUnarchive}>
              <ArchiveRestoreIcon />
              <Trans message="Restore to draft" />
            </Dropdown.Item>
          ) : (
            <Dropdown.Item disabled={busy} onClick={onArchive}>
              <ArchiveIcon />
              <Trans message="Archive" />
            </Dropdown.Item>
          )}

          <Dropdown.LinkItem
            render={<Link to={`/dashboard/items/${product.id}/reviews`} />}
          >
            <StarIcon />
            <Trans message="Reviews" />
          </Dropdown.LinkItem>

          {product.status === 'approved' && product.biolinks?.length ? (
            <>
              <Dropdown.Separator />
              <Dropdown.Group>
                <Dropdown.GroupLabel>
                  <Trans message="Published on" />
                </Dropdown.GroupLabel>
                {product.biolinks.map(biolink => (
                  <Dropdown.LinkItem
                    key={biolink.id}
                    href={productPublicUrl(product, biolink)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLinkIcon />
                    <span className="max-w-40 truncate">{biolink.name}</span>
                  </Dropdown.LinkItem>
                ))}
              </Dropdown.Group>
            </>
          ) : null}

          <Dropdown.Separator />
          <Dropdown.Item
            variant="destructive"
            disabled={hasSales}
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2Icon />
            {hasSales ? (
              <Trans message="Delete blocked after sales" />
            ) : (
              <Trans message="Delete product" />
            )}
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>

      <AlertDialog.Root
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Content size="sm">
            <AlertDialog.Header>
              <AlertDialog.Media className="bg-destructive/10 text-destructive">
                <Trash2Icon />
              </AlertDialog.Media>
              <AlertDialog.Title>
                <Trans message="Delete this product?" />
              </AlertDialog.Title>
              <AlertDialog.Description>
                <Trans message="This removes the product from every storefront. Purchased files stay available to buyers through their orders. This action cannot be undone." />
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel disabled={busy}>
                <Trans message="Cancel" />
              </AlertDialog.Cancel>
              <AlertDialog.Action
                color="danger"
                disabled={busy}
                onClick={async () => {
                  if (await onDelete()) {
                    setDeleteDialogOpen(false);
                  }
                }}
              >
                {busy ? (
                  <Trans message="Deleting..." />
                ) : (
                  <Trans message="Delete product" />
                )}
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}

function ProductCoverFallback() {
  return (
    <div className="flex size-full items-center justify-center bg-muted/45">
      <div className="flex size-10 items-center justify-center rounded-card-sm bg-background/85 text-muted-foreground ring-1 ring-foreground/10">
        <PackageIcon className="size-4" />
      </div>
    </div>
  );
}

function StatusBadge({
  status,
  hasPendingUpdate = false,
}: {
  status: ProductStatus;
  hasPendingUpdate?: boolean;
}) {
  if (status === 'approved' && hasPendingUpdate) {
    return (
      <Badge variant="secondary">
        <Trans message="Update under review" />
      </Badge>
    );
  }

  switch (status) {
    case 'pending_approval':
      return (
        <Badge variant="secondary">
          <Trans message="In review" />
        </Badge>
      );
    case 'approved':
      return (
        <Badge variant="default">
          <Trans message="Live" />
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="destructive">
          <Trans message="Needs changes" />
        </Badge>
      );
    case 'archived':
      return (
        <Badge variant="secondary">
          <Trans message="Archived" />
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          <Trans message="Draft" />
        </Badge>
      );
  }
}

function EmptyProducts({onNewProduct}: {onNewProduct: () => void}) {
  return (
    <Empty.Root className="rounded-card border border-dashed py-20">
      <Empty.Header>
        <Empty.Media variant="icon">
          <StoreIcon />
        </Empty.Media>
        <Empty.Title>
          <Trans message="Create your first digital product" />
        </Empty.Title>
        <Empty.Description>
          <Trans message="Upload a cover and downloadable file, set your price, then publish it to a storefront." />
        </Empty.Description>
      </Empty.Header>
      <Empty.Content>
        <Button onClick={onNewProduct}>
          <PackagePlusIcon />
          <Trans message="Create product" />
        </Button>
      </Empty.Content>
    </Empty.Root>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-5">
      {[1, 2, 3].map(item => (
        <Card.Root key={item} className="gap-0 overflow-hidden py-0">
          <Card.Header className="p-0">
            <Skeleton className="aspect-video w-full rounded-none" />
          </Card.Header>
          <Card.Content className="flex flex-col gap-3 p-4 pb-0">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </Card.Content>
          <Card.Footer className="justify-between px-4 py-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-24" />
          </Card.Footer>
        </Card.Root>
      ))}
    </div>
  );
}

function productPublicUrl(product: Product, biolink: ProductBiolink): string {
  return `${biolink.short_url.replace(/\/$/, '')}/products/${product.id}`;
}

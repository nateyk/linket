import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Empty} from '@shadcn/empty/empty';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {toast} from '@ui/toast/toast';
import useClipboard from '@ui/utils/hooks/use-clipboard';
import {
  ArchiveIcon,
  CheckCircle2Icon,
  CheckIcon,
  CircleAlertIcon,
  CircleDashedIcon,
  Clock3Icon,
  CopyIcon,
  ExternalLinkIcon,
  FileDownIcon,
  MoreHorizontalIcon,
  PackageIcon,
  PackagePlusIcon,
  PencilIcon,
  SendIcon,
  StarIcon,
  StoreIcon,
  Trash2Icon,
  TriangleAlertIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Link} from 'react-router';
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
  status: ProductStatus;
  rejection_reason?: string | null;
  sales_count: number;
  gross_revenue_cents: number;
  cover?: {url: string} | null;
  files?: unknown[];
  biolinks?: ProductBiolink[];
};

type ProductsResponse = {
  data?: Product[];
};

export function Component() {
  const {trans} = useTrans();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [submittingId, setSubmittingId] = useState<number>();
  const [deletingId, setDeletingId] = useState<number>();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const response = await fetch('/api/v1/digital-products?per_page=100', {
        credentials: 'same-origin',
        headers: {Accept: 'application/json'},
      });

      if (!response.ok) {
        throw new Error(
          await responseErrorMessage(
            response,
            trans({message: 'Unable to load digital products.'}),
          ),
        );
      }

      const payload: ProductsResponse = await response.json();
      setProducts(payload.data ?? []);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : trans({message: 'Unable to load digital products.'}),
      );
    } finally {
      setLoading(false);
    }
  }, [trans]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (product: Product) => {
    setSubmittingId(product.id);
    setError(undefined);

    try {
      await apiClient.post(`/api/v1/digital-products/${product.id}/submit`);
      toast.positive(message('Product submitted for review'));
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : trans({message: 'Unable to submit product.'}),
      );
    } finally {
      setSubmittingId(undefined);
    }
  };

  const remove = async (product: Product): Promise<boolean> => {
    setDeletingId(product.id);
    setError(undefined);

    try {
      await apiClient.delete(`/api/v1/digital-products/${product.id}`);
      setProducts(current => current.filter(item => item.id !== product.id));
      toast.positive(message('Product deleted'));
      return true;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : trans({message: 'Unable to delete product.'}),
      );
      return false;
    } finally {
      setDeletingId(undefined);
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Digital Products" />
        </DashboardLayout.SectionTitle>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PackagePlusIcon />
          <Trans message="New product" />
        </Button>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 py-6">
          {error && <ErrorNotice message={error} onRetry={() => void load()} />}

          {loading ? (
            <ProductSkeleton />
          ) : products.length ? (
            <div className="grid grid-cols-1 gap-5 sm:[grid-template-columns:repeat(auto-fill,minmax(280px,340px))]">
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  submitting={submittingId === product.id}
                  deleting={deletingId === product.id}
                  onSubmit={() => void submit(product)}
                  onDelete={() => remove(product)}
                />
              ))}
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
  deleting,
  onSubmit,
  onDelete,
}: {
  product: Product;
  submitting: boolean;
  deleting: boolean;
  onSubmit: () => void;
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

  return (
    <Card.Root className="group gap-0 overflow-hidden py-0 shadow-xs transition-shadow hover:shadow-md">
      <Card.Header className="relative block p-0">
        <Link
          to={`/dashboard/my-products/${product.id}/edit`}
          className="block aspect-video overflow-hidden bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        >
          {product.cover?.url ? (
            <img
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.025]"
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
          <StatusBadge status={product.status} />
        </div>
      </Card.Header>

      <Card.Content className="flex flex-col gap-3 p-4 pb-0">
        <div className="flex min-w-0 flex-col gap-1">
          <Card.Title className="truncate text-sm font-semibold leading-5">
            <Link
              to={`/dashboard/my-products/${product.id}/edit`}
              className="hover:underline hover:underline-offset-3"
            >
              {product.title}
            </Link>
          </Card.Title>
          <p className="text-lg font-semibold leading-7">
            <FormattedCurrency
              valueInCents={product.price_cents}
              currency={product.currency.toUpperCase()}
            />
          </p>
        </div>

        <Card.Description className="line-clamp-2 min-h-10 leading-5">
          {product.description ? (
            plainTextDescription(product.description)
          ) : (
            <Trans message="Add a clear description to help customers understand what they will receive." />
          )}
        </Card.Description>

        {product.status === 'rejected' && product.rejection_reason && (
          <div className="flex gap-2 rounded-card-sm bg-destructive/8 p-2.5 text-xs leading-4 text-destructive">
            <TriangleAlertIcon className="mt-0.5 size-3.5 shrink-0" />
            <span className="line-clamp-2">{product.rejection_reason}</span>
          </div>
        )}

        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <SalesLabel count={product.sales_count} />
          <span className="size-1 rounded-full bg-muted-foreground/40" />
          <span className="truncate">
            <FormattedCurrency
              valueInCents={product.gross_revenue_cents}
              currency={product.currency.toUpperCase()}
            />{' '}
            <Trans message="revenue" />
          </span>
        </div>
      </Card.Content>

      <Card.Footer className="justify-between gap-3 px-4 py-4">
        <Badge variant="secondary">
          <FileDownIcon />
          <Trans message="Digital download" />
        </Badge>

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

            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <Button
                    aria-label={trans({message: 'Edit product'})}
                    size="icon-sm"
                    variant="ghost"
                    nativeButton={false}
                    render={
                      <Link to={`/dashboard/my-products/${product.id}/edit`} />
                    }
                  >
                    <PencilIcon />
                  </Button>
                }
              />
              <Tooltip.Content>
                <Trans message="Edit product" />
              </Tooltip.Content>
            </Tooltip.Root>

            <ProductActions
              product={product}
              canSubmit={canSubmit}
              submitting={submitting}
              deleting={deleting}
              onSubmit={onSubmit}
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
  deleting,
  onSubmit,
  onDelete,
}: {
  product: Product;
  canSubmit: boolean;
  submitting: boolean;
  deleting: boolean;
  onSubmit: () => void;
  onDelete: () => Promise<boolean>;
}) {
  const {trans} = useTrans();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <Dropdown.Root>
        <Dropdown.Trigger
          aria-label={trans({message: 'More product actions'})}
          render={<Button variant="ghost" size="icon-sm" />}
        >
          <MoreHorizontalIcon />
        </Dropdown.Trigger>
        <Dropdown.Content align="end">
          <Dropdown.LinkItem
            render={<Link to={`/dashboard/my-products/${product.id}/edit`} />}
          >
            <PencilIcon />
            <Trans message="Edit product" />
          </Dropdown.LinkItem>

          {canSubmit && (
            <Dropdown.Item
              disabled={submitting || !product.files?.length}
              onClick={onSubmit}
            >
              <SendIcon />
              {submitting ? (
                <Trans message="Submitting..." />
              ) : (
                <Trans message="Submit for review" />
              )}
            </Dropdown.Item>
          )}

          <Dropdown.LinkItem
            render={<Link to={`/dashboard/my-products/${product.id}/reviews`} />}
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
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2Icon />
            <Trans message="Delete product" />
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
                <Trans message="This removes the product from every storefront. This action cannot be undone." />
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel disabled={deleting}>
                <Trans message="Cancel" />
              </AlertDialog.Cancel>
              <AlertDialog.Action
                color="danger"
                disabled={deleting}
                onClick={async () => {
                  if (await onDelete()) {
                    setDeleteDialogOpen(false);
                  }
                }}
              >
                {deleting ? (
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
      <div className="flex size-10 items-center justify-center rounded-card-sm bg-background/85 text-muted-foreground shadow-xs ring-1 ring-foreground/10">
        <PackageIcon className="size-4" />
      </div>
    </div>
  );
}

function StatusBadge({status}: {status: ProductStatus}) {
  const className = 'border border-border/70 bg-background/95 shadow-sm';

  switch (status) {
    case 'pending_approval':
      return (
        <Badge variant="secondary" className={className}>
          <Clock3Icon />
          <Trans message="In review" />
        </Badge>
      );
    case 'approved':
      return (
        <Badge variant="positive" className={className}>
          <CheckCircle2Icon />
          <Trans message="Live" />
        </Badge>
      );
    case 'rejected':
      return (
        <Badge variant="destructive" className={className}>
          <TriangleAlertIcon />
          <Trans message="Needs changes" />
        </Badge>
      );
    case 'archived':
      return (
        <Badge variant="secondary" className={className}>
          <ArchiveIcon />
          <Trans message="Archived" />
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className={className}>
          <CircleDashedIcon />
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
    <div className="grid grid-cols-1 gap-5 sm:[grid-template-columns:repeat(auto-fill,minmax(280px,340px))]">
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

async function responseErrorMessage(response: Response, fallback: string) {
  const payload = await response.json().catch(() => undefined);
  return typeof payload?.message === 'string' ? payload.message : fallback;
}

function plainTextDescription(description: string): string {
  if (typeof DOMParser !== 'undefined') {
    const document = new DOMParser().parseFromString(description, 'text/html');
    return document.body.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  }

  return description.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

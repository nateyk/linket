import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Empty} from '@shadcn/empty/empty';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {Trans} from '@ui/i18n/trans';
import {
  CircleAlertIcon,
  EllipsisIcon,
  FileDownIcon,
  LayoutGridIcon,
  PackagePlusIcon,
  PencilIcon,
  SendIcon,
  StoreIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Link} from 'react-router';

type ProductStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'archived';

type Product = {
  id: number;
  title: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  status: ProductStatus;
  cover?: {url: string} | null;
  files?: unknown[];
  biolinks?: Array<{id: number; name: string}>;
};

export function Component() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [submittingId, setSubmittingId] = useState<number>();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);

    try {
      const response = await fetch('/api/v1/digital-products', {
        credentials: 'same-origin',
        headers: {Accept: 'application/json'},
      });

      if (!response.ok) {
        throw new Error(
          await responseErrorMessage(
            response,
            'Unable to load digital products.',
          ),
        );
      }

      const payload = await response.json();
      setProducts(payload.data ?? []);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Unable to load digital products.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (product: Product) => {
    setSubmittingId(product.id);

    try {
      await apiClient.post(`/api/v1/digital-products/${product.id}/submit`);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Unable to submit product.',
      );
    } finally {
      setSubmittingId(undefined);
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Digital Products" />
        </DashboardLayout.SectionTitle>
        <Button render={<Link to="/dashboard/my-products/new" />}>
          <PackagePlusIcon />
          <Trans message="New product" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-7xl py-6">
          {error && <ErrorNotice message={error} onRetry={() => void load()} />}
          <DashboardLayout.SectionContentHeader className="mb-4">
            <div className="flex items-center gap-2">
              <LayoutGridIcon className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                <Trans message="All products" />
              </span>
              {!loading && <Badge variant="outline">{products.length}</Badge>}
            </div>
            <span className="ms-auto text-sm text-muted-foreground">
              <Trans message="Digital downloads" />
            </span>
          </DashboardLayout.SectionContentHeader>
          {loading ? (
            <ProductSkeleton />
          ) : products.length ? (
            <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
              {products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  submitting={submittingId === product.id}
                  onSubmit={() => void submit(product)}
                />
              ))}
            </div>
          ) : (
            <EmptyProducts />
          )}
        </div>
      </DashboardLayout.SectionContent>
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
    <div className="mb-5 flex items-center gap-3 rounded-input border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
      <CircleAlertIcon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1">{message}</span>
      <Button size="sm" variant="outline" onClick={onRetry}>
        <Trans message="Retry" />
      </Button>
    </div>
  );
}

function ProductCard({
  product,
  submitting,
  onSubmit,
}: {
  product: Product;
  submitting: boolean;
  onSubmit: () => void;
}) {
  const needsSetup = product.status === 'draft' || product.status === 'rejected';

  return (
    <Card.Root className="group overflow-hidden gap-0 border-border/80 transition-shadow hover:shadow-md">
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {product.cover?.url ? (
          <img
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            src={product.cover.url}
            alt=""
          />
        ) : (
          <MockCover title={product.title} />
        )}
        <div className="absolute top-3 left-3">
          {needsSetup ? (
            <Badge color="warning" className="bg-background/95 shadow-sm">
              <Trans message="Needs setup" />
            </Badge>
          ) : (
            <StatusBadge status={product.status} />
          )}
        </div>
      </div>
      <Card.Content className="flex min-h-45 flex-col p-4">
        <div className="min-w-0">
          <h2 className="truncate font-medium">{product.title}</h2>
          <p className="mt-1 text-lg font-semibold tracking-tight">
            {formatMoney(product.price_cents, product.currency)}
          </p>
        </div>
        <p className="mt-2 line-clamp-2 min-h-10 text-sm text-muted-foreground">
          {product.description || (
            <Trans message="Add a description so customers know what they will receive." />
          )}
        </p>
        <div className="mt-auto pt-4">
          <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              <Trans message="No sales yet" />
            </span>
            <span>
              <Trans
                message=":count bio pages"
                values={{count: product.biolinks?.length ?? 0}}
              />
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary">
              <FileDownIcon className="size-3.5" />
              <Trans message="Download" />
            </Badge>
            <div className="flex items-center gap-1">
              <Tooltip label={<Trans message="Edit product" />}>
                <Button
                  size="icon-xs"
                  variant="ghost"
                  render={
                    <Link to={`/dashboard/my-products/${product.id}/edit`} />
                  }
                >
                  <PencilIcon />
                </Button>
              </Tooltip>
              {needsSetup && (
                <Tooltip label={<Trans message="Submit for review" />}>
                  <Button
                    size="icon-xs"
                    disabled={submitting || !product.files?.length}
                    onClick={onSubmit}
                  >
                    <SendIcon />
                  </Button>
                </Tooltip>
              )}
              <Tooltip label={<Trans message="More actions coming soon" />}>
                <Button size="icon-xs" variant="ghost">
                  <EllipsisIcon />
                </Button>
              </Tooltip>
            </div>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  );
}

function MockCover({title}: {title: string}) {
  return (
    <div className="flex size-full items-end bg-gradient-to-br from-primary/25 via-primary/10 to-muted p-4">
      <div className="rounded-card-sm border border-white/30 bg-background/80 px-3 py-2 text-xs font-medium shadow-sm backdrop-blur-sm">
        <Trans message="Digital download" />
        <span className="block max-w-42 truncate text-foreground">{title}</span>
      </div>
    </div>
  );
}

function StatusBadge({status}: {status: ProductStatus}) {
  const values: Record<
    ProductStatus,
    {label: string; color?: 'positive' | 'danger' | 'warning'}
  > = {
    draft: {label: 'Draft'},
    pending_approval: {label: 'In review', color: 'warning'},
    approved: {label: 'Approved', color: 'positive'},
    rejected: {label: 'Needs changes', color: 'danger'},
    archived: {label: 'Archived'},
  };
  const value = values[status];

  return (
    <Badge color={value.color} className="bg-background/95 shadow-sm">
      <Trans message={value.label} />
    </Badge>
  );
}

function EmptyProducts() {
  return (
    <Empty.Root className="border-y py-20">
      <Empty.Header>
        <Empty.Media variant="icon">
          <StoreIcon />
        </Empty.Media>
        <Empty.Title>
          <Trans message="Create your first digital product" />
        </Empty.Title>
        <Empty.Description>
          <Trans message="Add a title, a downloadable file, and the bio pages where it will appear." />
        </Empty.Description>
      </Empty.Header>
      <Empty.Content>
        <Button render={<Link to="/dashboard/my-products/new" />}>
          <PackagePlusIcon />
          <Trans message="Create product" />
        </Button>
      </Empty.Content>
    </Empty.Root>
  );
}

function ProductSkeleton() {
  return (
    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
      {[1, 2, 3, 4].map(item => (
        <Card.Root key={item} className="overflow-hidden">
          <Skeleton className="aspect-[4/3] w-full" />
          <Card.Content>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-3 h-6 w-1/3" />
            <Skeleton className="mt-5 h-10 w-full" />
          </Card.Content>
        </Card.Root>
      ))}
    </div>
  );
}

async function responseErrorMessage(response: Response, fallback: string) {
  const payload = await response.json().catch(() => undefined);
  return typeof payload?.message === 'string' ? payload.message : fallback;
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

import {useShowGlobalLoadingBar} from '@common/core/use-show-global-loading-bar';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {apiClient} from '@common/http/query-client';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Tabs} from '@shadcn/tabs/tabs';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useQueryClient, useSuspenseQuery} from '@tanstack/react-query';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {formatMoney} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {prettyBytes} from '@ui/utils/files/pretty-bytes';
import {
  ArrowLeftIcon,
  ArrowUpRightIcon,
  CheckIcon,
  FileIcon,
  XIcon,
} from 'lucide-react';
import {useState, type ReactNode} from 'react';
import {Link, useParams} from 'react-router';
import {
  type AdminDigitalProductStatus,
  looksLikeHtml,
  ProductStatusBadge,
} from './admin-digital-product-display';
import {
  adminDigitalProductDetailBaseKey,
  adminDigitalProductDetailOptions,
} from './admin-digital-product-detail-queries';
import {adminDigitalProductsBaseKey} from './admin-digital-products-queries';
import {StatisticsPanel} from '@app/digital-products/shared/product-statistics/statistics-panel';
import {AdminProductReviewsTable} from './admin-product-reviews-table';

type HistoryEvent = {
  id: number;
  event: string;
  actor_role: string;
  actor: {id: number; name: string} | null;
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  meta: {changed?: string[]; review_requested?: boolean} | null;
  created_at: string | null;
};

type AdminProductDetail = {
  id: number;
  title: string;
  description?: string | null;
  learning_outcomes?: string[] | null;
  type?: string;
  is_course?: boolean;
  status: AdminDigitalProductStatus;
  rejection_reason?: string | null;
  review_requested_at?: string | null;
  has_pending_update?: boolean;
  pending_changes?: Array<{
    field: string;
    label: string;
    before: string;
    after: string;
  }> | null;
  approved_at?: string | null;
  price_cents: number;
  currency: string;
  sales_count: number;
  reviews_count: number;
  created_at?: string | null;
  updated_at?: string | null;
  creator?: {id: number; name: string; email: string; username?: string};
  cover?: {id: number; name: string; url: string} | null;
  files?: Array<{
    id: number;
    name: string;
    file_size: number;
    extension: string;
    download_path: string;
  }>;
  stores?: Array<{id: number; name: string; short_url: string}>;
  course?: {
    id: number;
    published_at?: string | null;
    chapters_count: number;
    lessons_count: number;
    published_lessons_count: number;
  } | null;
  history?: HistoryEvent[];
};

export function Component() {
  const {productId} = useParams();
  const {trans} = useTrans();
  const query = useSuspenseQuery(adminDigitalProductDetailOptions(productId ?? ''));
  const queryClient = useQueryClient();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reReviewOpen, setReReviewOpen] = useState(false);
  const [reason, setReason] = useState('');

  const product = query.data?.data as AdminProductDetail | undefined;

  useShowGlobalLoadingBar({isLoading: query.isFetching});

  const invalidate = () => {
    queryClient.invalidateQueries({queryKey: adminDigitalProductsBaseKey});
    queryClient.invalidateQueries({queryKey: adminDigitalProductDetailBaseKey});
  };

  const approve = useMutation({
    mutationFn: () =>
      apiClient.post(`/api/v1/admin/items/${product?.id}/approve`),
    onSuccess: () => {
      invalidate();
      toast.success(<Trans message="Product approved." />);
    },
    onError: error => showHttpErrorToast(error),
  });

  const reject = useMutation({
    mutationFn: () =>
      apiClient.post(`/api/v1/admin/items/${product?.id}/reject`, {
        reason: reason.trim() || null,
      }),
    onSuccess: () => {
      setRejectOpen(false);
      setReason('');
      invalidate();
      toast.success(<Trans message="Product rejected." />);
    },
    onError: error => showHttpErrorToast(error),
  });

  const reReview = useMutation({
    mutationFn: () =>
      apiClient.post(`/api/v1/admin/items/${product?.id}/re-review`, {
        reason: reason.trim(),
      }),
    onSuccess: () => {
      setReReviewOpen(false);
      setReason('');
      invalidate();
      toast.success(<Trans message="Product sent back for review." />);
    },
    onError: error => showHttpErrorToast(error),
  });

  if (!product) {
    return null;
  }

  const isActionable =
    product.status === 'pending_approval' || !!product.has_pending_update;
  const isPublished = product.status === 'approved' && !product.has_pending_update;
  const primaryStore = product.stores?.[0];
  const publicUrl = primaryStore
    ? `${primaryStore.short_url.replace(/\/$/, '')}/products/${product.id}`
    : null;

  return (
    <DashboardLayout.MainSection>
      <StaticPageTitle>{product.title}</StaticPageTitle>

      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <span className="flex items-center gap-2">
            {product.title}
            <ProductStatusBadge
              status={product.status}
              hasPendingUpdate={product.has_pending_update}
            />
          </span>
        </DashboardLayout.SectionTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/admin/items" />}
          >
            <ArrowLeftIcon />
            <Trans message="Back to products" />
          </Button>
          {publicUrl && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<a href={publicUrl} target="_blank" rel="noreferrer" />}
            >
              <ArrowUpRightIcon />
              <Trans message="View live" />
            </Button>
          )}
          {isPublished && (
            <Button variant="outline" onClick={() => { setReason(''); setReReviewOpen(true); }}>
              <Trans message="Send back for review" />
            </Button>
          )}
          {isActionable && (
            <>
              <Button
                variant="outline"
                color="danger"
                disabled={reject.isPending}
                onClick={() => { setReason(''); setRejectOpen(true); }}
              >
                <XIcon />
                <Trans message="Reject" />
              </Button>
              <Button disabled={approve.isPending} onClick={() => approve.mutate()}>
                <CheckIcon />
                <Trans message="Approve" />
              </Button>
            </>
          )}
        </div>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent>
        <Tabs.Root defaultValue="details" className="mx-auto w-full max-w-6xl">
          <Tabs.List variant="line" className="mb-4">
            <Tabs.Tab value="details">
              <Trans message="Details" />
            </Tabs.Tab>
            <Tabs.Tab value="history">
              <Trans message="History" />
            </Tabs.Tab>
            <Tabs.Tab value="statistics">
              <Trans message="Statistics" />
            </Tabs.Tab>
            <Tabs.Tab value="reviews">
              <Trans message="Reviews" />
            </Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="details">
            <DetailsPanel product={product} />
          </Tabs.Panel>
          <Tabs.Panel value="history">
            <HistoryPanel history={product.history ?? []} />
          </Tabs.Panel>
          <Tabs.Panel value="statistics">
            <StatisticsPanel
              productId={String(product.id)}
              queryKey={['adminProductStatistics']}
              endpoint={`/api/v1/admin/items/${product.id}/statistics`}
              currency={product.currency}
            />
          </Tabs.Panel>
          <Tabs.Panel value="reviews">
            <AdminProductReviewsTable productId={String(product.id)} />
          </Tabs.Panel>
        </Tabs.Root>
      </DashboardLayout.SectionContent>

      <Dialog.Root open={rejectOpen} onOpenChange={setRejectOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Content className="sm:max-w-lg">
            <Dialog.Header>
              <Dialog.Title>
                <Trans message="Reject product" />
              </Dialog.Title>
              <Dialog.Description>
                <Trans message="Explain what the creator should change. This is sent with the rejection." />
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Body>
              <Field.Root>
                <Field.Label htmlFor="detail-rejection-reason">
                  <Trans message="Rejection reason" />
                </Field.Label>
                <Textarea
                  id="detail-rejection-reason"
                  rows={4}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={trans({
                    message: 'Explain what the creator should change.',
                  })}
                />
              </Field.Root>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => setRejectOpen(false)}>
                <Trans message="Cancel" />
              </Button>
              <Button
                variant="outline"
                color="danger"
                disabled={reject.isPending || reason.trim().length < 3}
                onClick={() => reject.mutate()}
              >
                <XIcon />
                <Trans message="Reject" />
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <Dialog.Root open={reReviewOpen} onOpenChange={setReReviewOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Content className="sm:max-w-lg">
            <Dialog.Header>
              <Dialog.Title>
                <Trans message="Send back for review" />
              </Dialog.Title>
              <Dialog.Description>
                <Trans message="This takes the product off the storefront until you approve it again. Past purchases stay available." />
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Body>
              <Field.Root>
                <Field.Label htmlFor="re-review-reason">
                  <Trans message="Reason" />
                </Field.Label>
                <Textarea
                  id="re-review-reason"
                  rows={4}
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder={trans({
                    message: 'Explain what needs another look.',
                  })}
                />
              </Field.Root>
            </Dialog.Body>
            <Dialog.Footer>
              <Button variant="outline" onClick={() => setReReviewOpen(false)}>
                <Trans message="Cancel" />
              </Button>
              <Button
                disabled={reReview.isPending || reason.trim().length < 3}
                onClick={() => reReview.mutate()}
              >
                <Trans message="Send back for review" />
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </DashboardLayout.MainSection>
  );
}

function DetailsPanel({product}: {product: AdminProductDetail}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        {product.pending_changes && product.pending_changes.length > 0 && (
          <Card.Root>
            <Card.Header>
              <Card.Title>
                <Trans message="Pending changes" />
              </Card.Title>
            </Card.Header>
            <Card.Content className="space-y-2 text-sm">
              {product.pending_changes.map(change => (
                <div
                  key={change.field}
                  className="flex flex-wrap items-baseline gap-2"
                >
                  <span className="font-medium">{change.label}</span>
                  <span className="text-muted-foreground line-through">
                    {change.before}
                  </span>
                  <span aria-hidden="true">→</span>
                  <span>{change.after}</span>
                </div>
              ))}
            </Card.Content>
          </Card.Root>
        )}
        <Card.Root>
          <Card.Content className="space-y-4 p-4">
            {product.cover?.url ? (
              <img
                src={product.cover.url}
                alt={product.title}
                className="aspect-video w-full rounded-card border object-cover"
              />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-card border bg-muted text-muted-foreground">
                <FileIcon className="size-6" aria-hidden="true" />
              </div>
            )}
            {product.description ? (
              looksLikeHtml(product.description) ? (
                <div
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{__html: product.description}}
                />
              ) : (
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {product.description}
                </p>
              )
            ) : (
              <p className="text-sm text-muted-foreground">
                <Trans message="No description provided." />
              </p>
            )}
          </Card.Content>
        </Card.Root>

        {product.learning_outcomes && product.learning_outcomes.length > 0 && (
          <Card.Root>
            <Card.Header>
              <Card.Title>
                <Trans message="Learning outcomes" />
              </Card.Title>
            </Card.Header>
            <Card.Content>
              <ul className="list-disc space-y-1 ps-5 text-sm">
                {product.learning_outcomes.map((outcome, index) => (
                  <li key={index}>{outcome}</li>
                ))}
              </ul>
            </Card.Content>
          </Card.Root>
        )}

        <Card.Root>
          <Card.Header>
            <Card.Title>
              <Trans message="Files" />
            </Card.Title>
          </Card.Header>
          <Card.Content className="space-y-2">
            {product.files && product.files.length > 0 ? (
              product.files.map(file => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.extension.toUpperCase()} •{' '}
                      {prettyBytes(file.file_size)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    nativeButton={false}
                    render={
                      <a href={file.download_path} target="_blank" rel="noreferrer" />
                    }
                  >
                    <Trans message="Download" />
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                <Trans message="No files attached." />
              </p>
            )}
          </Card.Content>
        </Card.Root>

        {product.is_course && product.course && (
          <Card.Root>
            <Card.Header>
              <Card.Title>
                <Trans message="Course" />
              </Card.Title>
            </Card.Header>
            <Card.Content className="grid gap-3 sm:grid-cols-3">
              <DetailStat
                label="Chapters"
                value={String(product.course.chapters_count)}
              />
              <DetailStat
                label="Lessons"
                value={String(product.course.lessons_count)}
              />
              <DetailStat
                label="Published lessons"
                value={String(product.course.published_lessons_count)}
              />
            </Card.Content>
          </Card.Root>
        )}
      </div>

      <Card.Root className="h-fit">
        <Card.Header>
          <Card.Title>
            <Trans message="Product info" />
          </Card.Title>
        </Card.Header>
        <Card.Content className="space-y-3 text-sm">
          <DetailRow label="ID">
            {String(product.id).padStart(4, '0')}
          </DetailRow>
          <DetailRow label="Type">{product.type ?? 'digital'}</DetailRow>
          <DetailRow label="Price">
            {product.price_cents === 0 ? (
              <Trans message="Free" />
            ) : (
              formatMoney(product.price_cents, product.currency)
            )}
          </DetailRow>
          <DetailRow label="Creator">
            {product.creator ? (
              <span>
                {product.creator.name}
                <span className="block text-xs text-muted-foreground">
                  {product.creator.email}
                </span>
              </span>
            ) : (
              '—'
            )}
          </DetailRow>
          <DetailRow label="Status">{product.status}</DetailRow>
          {product.rejection_reason && (
            <DetailRow label="Rejection reason">
              <span className="text-destructive">
                {product.rejection_reason}
              </span>
            </DetailRow>
          )}
          <DetailRow label="Created">
            <FormattedDate date={product.created_at} />
          </DetailRow>
          <DetailRow label="Approved">
            <FormattedDate date={product.approved_at} />
          </DetailRow>
          <DetailRow label="Stores">
            {product.stores && product.stores.length > 0 ? (
              <span className="flex flex-col gap-1">
                {product.stores.map(store => (
                  <a
                    key={store.id}
                    href={store.short_url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {store.name}
                  </a>
                ))}
              </span>
            ) : (
              '—'
            )}
          </DetailRow>
          <DetailRow label="Sales">{String(product.sales_count)}</DetailRow>
          <DetailRow label="Reviews">{String(product.reviews_count)}</DetailRow>
        </Card.Content>
      </Card.Root>
    </div>
  );
}

function HistoryPanel({history}: {history: HistoryEvent[]}) {
  if (!history.length) {
    return (
      <Card.Root>
        <Card.Content className="py-10 text-center text-sm text-muted-foreground">
          <Trans message="No history recorded for this product yet." />
        </Card.Content>
      </Card.Root>
    );
  }

  return (
    <Card.Root>
      <Card.Content className="divide-y p-0">
        {history.map(event => (
          <div key={event.id} className="flex gap-3 p-4 text-sm">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">
                  {eventLabel(event.event)}
                </span>
                {event.from_status && event.to_status && (
                  <span className="text-xs text-muted-foreground">
                    {event.from_status} → {event.to_status}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {event.actor?.name ?? event.actor_role} ({event.actor_role})
                {' · '}
                <FormattedDate date={event.created_at} />
              </p>
              {event.reason && (
                <p className="text-xs text-destructive">
                  <Trans
                    message="Reason: :reason"
                    values={{reason: event.reason}}
                  />
                </p>
              )}
              {event.meta?.changed && event.meta.changed.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  <Trans
                    message="Changed: :fields"
                    values={{fields: event.meta.changed.join(', ')}}
                  />
                </p>
              )}
              {event.meta?.review_requested && (
                <p className="text-xs text-muted-foreground">
                  <Trans message="Queued for review" />
                </p>
              )}
            </div>
          </div>
        ))}
      </Card.Content>
    </Card.Root>
  );
}

function eventLabel(event: string) {
  switch (event) {
    case 'created':
      return <Trans message="Created" />;
    case 'updated':
      return <Trans message="Updated" />;
    case 'submitted':
      return <Trans message="Submitted for review" />;
    case 'update_submitted':
      return <Trans message="Update submitted for review" />;
    case 'approved':
      return <Trans message="Approved" />;
    case 'update_approved':
      return <Trans message="Update approved" />;
    case 'rejected':
      return <Trans message="Rejected" />;
    case 'update_rejected':
      return <Trans message="Update rejected" />;
    case 're_review':
      return <Trans message="Sent back for review" />;
    default:
      return event;
  }
}

function DetailRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted-foreground">
        <Trans message={label} />
      </span>
      <span className="text-end">{children}</span>
    </div>
  );
}

function DetailStat({label, value}: {label: string; value: string}) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">
        <Trans message={label} />
      </p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

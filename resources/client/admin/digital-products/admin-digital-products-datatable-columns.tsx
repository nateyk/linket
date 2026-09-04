import {apiClient} from '@common/http/query-client';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Field} from '@shadcn/forms/field';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {SortableHeader} from '@shadcn/table/utils/sortable-header';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {ColumnDef} from '@tanstack/react-table';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {formatMoney} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {
  BadgeCheckIcon,
  BookOpenIcon,
  CheckIcon,
  ClockIcon,
  EllipsisIcon,
  EyeIcon,
  FileIcon,
  ShieldCheckIcon,
  StarIcon,
  XCircleIcon,
  XIcon,
  GraduationCapIcon,
  PackageIcon,
} from 'lucide-react';
import {useState} from 'react';
import {Link} from 'react-router';
import {adminDigitalProductsBaseKey} from './admin-digital-products-queries';

export type AdminDigitalProduct = {
  id: number;
  title: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'draft';
  rejection_reason?: string | null;
  created_at?: string;
  creator?: {name: string; email: string};
  cover?: {url: string} | null;
  files?: Array<{id: number; name: string}>;
  reviews_count?: number;
  hidden_reviews_count?: number;
  type?: string;
};

export const adminDigitalProductColumns: ColumnDef<AdminDigitalProduct>[] = [
  {
    id: 'id',
    accessorKey: 'id',
    enableSorting: true,
    size: 80,
    header: ({column}) => (
      <SortableHeader column={column} aria-label="Sort by ID">
        <Trans message="ID" />
      </SortableHeader>
    ),
    cell: ({row}) => (
      <span className="font-mono text-xs font-medium tabular-nums" aria-label={`Product ID ${row.original.id}`}>
        #{row.original.id}
      </span>
    ),
  },
  {
    id: 'title',
    accessorKey: 'title',
    enableSorting: true,
    size: 320,
    header: () => <Trans message="Product" />,
    cell: ({row}) => {
      const product = row.original;
      const isCourse = product.type === 'course';
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="relative shrink-0">
            {product.cover?.url ? (
              <img
                className="size-10 rounded-lg border object-cover shadow-xs"
                src={product.cover.url}
                alt={`${product.title} cover`}
                loading="lazy"
                width={40}
                height={40}
              />
            ) : (
              <div
                className="flex size-10 items-center justify-center rounded-lg border bg-muted"
                aria-hidden="true"
              >
                <FileIcon className="size-4 text-muted-foreground" />
              </div>
            )}
            {isCourse && (
              <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm ring-2 ring-background">
                <GraduationCapIcon className="size-3" aria-hidden="true" />
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-medium leading-none" title={product.title}>
                {product.title}
              </p>
              {isCourse ? (
                <Badge variant="outline" className="hidden h-5 px-1.5 text-[10px] font-medium sm:inline-flex">
                  <BookOpenIcon className="size-3" aria-hidden="true" />
                  <Trans message="Course" />
                </Badge>
              ) : (
                <Badge variant="outline" className="hidden h-5 px-1.5 text-[10px] font-medium sm:inline-flex">
                  <PackageIcon className="size-3" aria-hidden="true" />
                  <Trans message="Digital" />
                </Badge>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <Tooltip.Provider>
                <Tooltip.Root>
                  <Tooltip.Trigger
                    render={
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <FileIcon className="size-3" aria-hidden="true" />
                        <Trans
                          message=":count files"
                          values={{count: product.files?.length ?? 0}}
                        />
                      </span>
                    }
                  />
                  <Tooltip.Content>
                    <Trans
                      message=":count file(s) attached"
                      values={{count: product.files?.length ?? 0}}
                    />
                  </Tooltip.Content>
                </Tooltip.Root>
              </Tooltip.Provider>
              {isCourse && (
                <span className="hidden text-xs text-muted-foreground sm:inline" aria-hidden="true">
                  •
                </span>
              )}
              <span className="hidden truncate text-xs text-muted-foreground sm:inline" title={product.creator?.name}>
                {product.creator?.name}
              </span>
            </div>
          </div>
        </div>
      );
    },
  },
  {
    id: 'creator',
    size: 200,
    header: () => <Trans message="Creator" />,
    cell: ({row}) => {
      const creator = row.original.creator;
      return (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-none">
            {creator?.name ?? <span className="text-muted-foreground">—</span>}
          </p>
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <p className="mt-1 truncate text-xs text-muted-foreground underline decoration-dotted underline-offset-2">
                    {creator?.email}
                  </p>
                }
              />
              <Tooltip.Content>
                <Trans message="Creator email" />: {creator?.email}
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>
      );
    },
  },
  {
    id: 'price_cents',
    accessorKey: 'price_cents',
    enableSorting: true,
    size: 110,
    header: ({column}) => (
      <SortableHeader column={column} aria-label="Sort by price">
        <Trans message="Price" />
      </SortableHeader>
    ),
    cell: ({row}) => {
      const isFree = row.original.price_cents === 0;
      if (isFree) {
        return (
          <Badge variant="secondary" className="font-medium">
            <Trans message="Free" />
          </Badge>
        );
      }
      return (
        <span className="text-sm font-medium tabular-nums">
          {formatMoney(row.original.price_cents, row.original.currency)}
        </span>
      );
    },
  },
  {
    id: 'status',
    enableSorting: true,
    size: 130,
    header: ({column}) => (
      <SortableHeader column={column} aria-label="Sort by status">
        <Trans message="Status" />
      </SortableHeader>
    ),
    cell: ({row}) => <ProductStatusBadge status={row.original.status} />,
  },
  {
    id: 'reviews',
    size: 110,
    header: () => <Trans message="Reviews" />,
    cell: ({row}) => {
      const product = row.original;
      const total = product.reviews_count ?? 0;
      const hidden = product.hidden_reviews_count ?? 0;
      return (
        <div className="flex flex-col gap-1" role="group" aria-label={`${total} reviews, ${hidden} hidden`}>
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger
                render={
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium tabular-nums">
                    <StarIcon className="size-3.5 text-amber-500" aria-hidden="true" />
                    {total}
                  </span>
                }
              />
              <Tooltip.Content>
                <Trans message=":count total reviews" values={{count: total}} />
              </Tooltip.Content>
            </Tooltip.Root>
          </Tooltip.Provider>
          {hidden > 0 ? (
            <Badge variant="outline" className="w-fit gap-1 text-xs font-normal">
              <EyeIcon className="size-3" aria-hidden="true" />
              <Trans message=":count hidden" values={{count: hidden}} />
            </Badge>
          ) : total === 0 ? (
            <span className="text-xs text-muted-foreground">
              <Trans message="No reviews" />
            </span>
          ) : null}
        </div>
      );
    },
  },
  {
    id: 'created_at',
    accessorKey: 'created_at',
    enableSorting: true,
    size: 160,
    header: ({column}) => (
      <SortableHeader column={column} aria-label="Sort by submission date">
        <Trans message="Submitted" />
      </SortableHeader>
    ),
    cell: ({row}) =>
      row.original.created_at ? (
        <Tooltip.Provider>
          <Tooltip.Root>
            <Tooltip.Trigger
              render={
                <time
                  className="text-xs text-muted-foreground underline decoration-dotted underline-offset-2"
                  dateTime={row.original.created_at}
                >
                  <FormattedDate date={row.original.created_at} />
                </time>
              }
            />
            <Tooltip.Content>
              <FormattedDate date={row.original.created_at} />
            </Tooltip.Content>
          </Tooltip.Root>
        </Tooltip.Provider>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      ),
  },
  {
    id: 'actions',
    size: 56,
    header: () => (
      <span className="sr-only">
        <Trans message="Actions" />
      </span>
    ),
    cell: ({row}) => <ProductActionsButton product={row.original} />,
  },
];

export function ProductActionsButton({
  product,
}: {
  product: AdminDigitalProduct;
}) {
  const queryClient = useQueryClient();
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reason, setReason] = useState('');

  const approve = useMutation({
    mutationFn: () =>
      apiClient.post(`/api/v1/admin/digital-products/${product.id}/approve`),
    onSuccess: () => {
      setDetailsOpen(false);
      queryClient.invalidateQueries({queryKey: adminDigitalProductsBaseKey});
      toast.success(<Trans message="Product approved and is now live." />);
    },
    onError: error => showHttpErrorToast(error),
  });

  const reject = useMutation({
    mutationFn: () =>
      apiClient.post(`/api/v1/admin/digital-products/${product.id}/reject`, {
        reason: reason.trim() || null,
      }),
    onSuccess: () => {
      setDetailsOpen(false);
      setReason('');
      queryClient.invalidateQueries({queryKey: adminDigitalProductsBaseKey});
      toast.success(<Trans message="Product rejected. Creator will be notified." />);
    },
    onError: error => showHttpErrorToast(error),
  });

  const isPending = product.status === 'pending_approval';

  return (
    <>
      <div className="flex justify-end">
        <Dropdown.Root>
          <Dropdown.Trigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Actions for ${product.title}`}
              />
            }
          >
            <EllipsisIcon className="size-4" aria-hidden="true" />
          </Dropdown.Trigger>
          <Dropdown.Content align="end" className="min-w-52" aria-label={`Actions for ${product.title}`}>
            <Dropdown.Item onClick={() => setDetailsOpen(true)}>
              <EyeIcon className="size-4" aria-hidden="true" />
              <Trans message="Review details" />
            </Dropdown.Item>
            <Dropdown.Item
              render={
                <Link to={`/admin/digital-products/${product.id}/reviews`} />
              }
            >
              <StarIcon className="size-4" aria-hidden="true" />
              <Trans message="Manage reviews" />
              {product.reviews_count ? (
                <Badge variant="secondary" className="ml-auto tabular-nums">
                  {product.reviews_count}
                </Badge>
              ) : null}
            </Dropdown.Item>
            {isPending && (
              <>
                <Dropdown.Separator />
                <Dropdown.Item
                  onClick={() => approve.mutate()}
                  disabled={approve.isPending || reject.isPending}
                  className="text-emerald-600 focus:text-emerald-600"
                >
                  <CheckIcon className="size-4" aria-hidden="true" />
                  <Trans message="Approve instantly" />
                </Dropdown.Item>
              </>
            )}
          </Dropdown.Content>
        </Dropdown.Root>
      </div>
      <Dialog.Root open={detailsOpen} onOpenChange={setDetailsOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop className="bg-background/80 backdrop-blur-sm" />
          <Dialog.Content
            className="sm:max-w-lg gap-0 p-0 overflow-hidden"
            aria-labelledby="review-dialog-title"
            aria-describedby="review-dialog-description"
          >
            <Dialog.Header className="border-b bg-muted/30 px-6 py-4">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ShieldCheckIcon className="size-5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <Dialog.Title
                    id="review-dialog-title"
                    className="text-base font-semibold leading-none"
                  >
                    <Trans message="Review digital product" />
                  </Dialog.Title>
                  <p
                    id="review-dialog-description"
                    className="mt-1.5 text-xs text-muted-foreground"
                  >
                    <Trans message="Approve to make it live on storefronts or reject with feedback." />
                  </p>
                </div>
                <ProductStatusBadge status={product.status} />
              </div>
            </Dialog.Header>
            <Dialog.Body className="max-h-[60vh] overflow-y-auto px-6 py-5">
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-semibold leading-none">{product.title}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant={product.price_cents === 0 ? 'secondary' : 'outline'} className="tabular-nums">
                      {product.price_cents === 0
                        ? 'Free'
                        : formatMoney(product.price_cents, product.currency)}
                    </Badge>
                    {product.type === 'course' ? (
                      <Badge variant="outline" className="gap-1">
                        <GraduationCapIcon className="size-3" aria-hidden="true" />
                        <Trans message="Course" />
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <PackageIcon className="size-3" aria-hidden="true" />
                        <Trans message="Digital product" />
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      <Trans message="ID #{id}" values={{id: product.id}} />
                    </span>
                  </div>
                  {product.description ? (
                    looksLikeHtml(product.description) ? (
                      <div
                        className="prose prose-sm mt-3 max-h-48 max-w-none overflow-y-auto rounded-lg border bg-muted/30 p-3 text-muted-foreground dark:prose-invert"
                        dangerouslySetInnerHTML={{__html: product.description}}
                      />
                    ) : (
                      <p className="mt-3 whitespace-pre-wrap rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
                        {product.description}
                      </p>
                    )
                  ) : (
                    <p className="mt-3 text-sm italic text-muted-foreground">
                      <Trans message="No description provided." />
                    </p>
                  )}
                </div>
                <div className="grid gap-3 rounded-xl border bg-card p-4 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      <Trans message="Creator" />
                    </span>
                    <span className="font-medium">{product.creator?.name ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      <Trans message="Email" />
                    </span>
                    <span className="font-mono text-xs">{product.creator?.email}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      <Trans message="Files" />
                    </span>
                    <Badge variant="secondary" className="tabular-nums">
                      {product.files?.length ?? 0}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-muted-foreground">
                      <Trans message="Submitted" />
                    </span>
                    <span className="text-xs">
                      {product.created_at ? (
                        <FormattedDate date={product.created_at} />
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>
                </div>
                {product.status === 'rejected' && product.rejection_reason && (
                  <div
                    role="alert"
                    className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm"
                  >
                    <p className="font-medium text-destructive">
                      <Trans message="Previously rejected" />
                    </p>
                    <p className="mt-1 text-destructive/90">{product.rejection_reason}</p>
                  </div>
                )}
                {isPending && (
                  <Field.Root>
                    <Field.Label htmlFor="rejection-reason">
                      <Trans message="Rejection reason" />
                      <span className="ml-1 font-normal text-muted-foreground">
                        (<Trans message="optional" />)
                      </span>
                    </Field.Label>
                    <Field.Description id="rejection-reason-desc">
                      <Trans message="Clear feedback helps creators get approved faster." />
                    </Field.Description>
                    <Textarea
                      id="rejection-reason"
                      aria-describedby="rejection-reason-desc"
                      rows={4}
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="Explain what the creator should change…"
                      className="resize-none"
                      maxLength={2000}
                    />
                    <p className="text-right text-xs tabular-nums text-muted-foreground">
                      {reason.length}/2000
                    </p>
                  </Field.Root>
                )}
                {!isPending && (
                  <div
                    role="status"
                    className="rounded-lg border bg-muted p-3 text-xs text-muted-foreground"
                  >
                    <Trans
                      message="This product is {status}. Only pending products can be approved or rejected."
                      values={{status: product.status}}
                    />
                  </div>
                )}
              </div>
            </Dialog.Body>
            <Dialog.Footer className="border-t bg-muted/20 px-6 py-4">
              <Button
                variant="outline"
                onClick={() => setDetailsOpen(false)}
                disabled={approve.isPending || reject.isPending}
                aria-label="Close dialog"
              >
                <Trans message="Close" />
              </Button>
              {isPending && (
                <>
                  <Button
                    color="danger"
                    variant="outline"
                    disabled={reject.isPending}
                    onClick={() => reject.mutate()}
                    aria-label="Reject product"
                    className="min-w-24"
                  >
                    {reject.isPending ? (
                      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                    ) : (
                      <XIcon className="size-4" aria-hidden="true" />
                    )}
                    <Trans message="Reject" />
                  </Button>
                  <Button
                    disabled={approve.isPending}
                    onClick={() => approve.mutate()}
                    aria-label="Approve product"
                    className="min-w-24 shadow-sm"
                  >
                    {approve.isPending ? (
                      <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" aria-hidden="true" />
                    ) : (
                      <CheckIcon className="size-4" aria-hidden="true" />
                    )}
                    <Trans message="Approve" />
                  </Button>
                </>
              )}
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

export function ProductStatusBadge({
  status,
}: {
  status: AdminDigitalProduct['status'];
}) {
  if (status === 'approved') {
    return (
      <Badge
        variant="positive"
        className="gap-1.5 font-medium shadow-xs"
        aria-label="Status: approved"
      >
        <BadgeCheckIcon className="size-3.5" aria-hidden="true" />
        <Trans message="Approved" />
      </Badge>
    );
  }
  if (status === 'rejected') {
    return (
      <Badge
        variant="destructive"
        className="gap-1.5 font-medium"
        aria-label="Status: rejected"
      >
        <XCircleIcon className="size-3.5" aria-hidden="true" />
        <Trans message="Rejected" />
      </Badge>
    );
  }
  if (status === 'draft') {
    return (
      <Badge variant="secondary" className="gap-1.5 font-medium" aria-label="Status: draft">
        <FileIcon className="size-3.5" aria-hidden="true" />
        <Trans message="Draft" />
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1.5 border-amber-200 bg-amber-50 font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
      aria-label="Status: pending review"
    >
      <ClockIcon className="size-3.5" aria-hidden="true" />
      <Trans message="Pending" />
    </Badge>
  );
}

function looksLikeHtml(value: string) {
  return /<[a-z][\s\S]*>/i.test(value);
}

import {apiClient} from '@common/http/query-client';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Field} from '@shadcn/forms/field';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {SortableHeader} from '@shadcn/table/utils/sortable-header';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {ColumnDef} from '@tanstack/react-table';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {formatMoney} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {
  BadgeCheckIcon,
  CheckIcon,
  ClockIcon,
  EllipsisIcon,
  EyeIcon,
  FileIcon,
  ShieldCheckIcon,
  StarIcon,
  XCircleIcon,
  XIcon,
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
      <SortableHeader column={column}>
        <Trans message="ID" />
      </SortableHeader>
    ),
    cell: ({row}) => (
      <span className="font-mono text-xs tabular-nums">#{row.original.id}</span>
    ),
  },
  {
    id: 'title',
    accessorKey: 'title',
    enableSorting: true,
    size: 300,
    header: () => <Trans message="Product" />,
    cell: ({row}) => {
      const product = row.original;
      return (
        <div className="flex items-center gap-3">
          {product.cover?.url ? (
            <img
              className="size-10 rounded-md object-cover"
              src={product.cover.url}
              alt=""
            />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-md bg-muted">
              <FileIcon className="size-4 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-medium" title={product.title}>
              {product.title}
            </p>
            <p className="text-xs text-muted-foreground">
              <Trans
                message=":count files"
                values={{count: product.files?.length ?? 0}}
              />
            </p>
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
          <p className="truncate text-sm font-medium">{creator?.name ?? '—'}</p>
          <p className="truncate text-xs text-muted-foreground" title={creator?.email}>
            {creator?.email}
          </p>
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
      <SortableHeader column={column}>
        <Trans message="Price" />
      </SortableHeader>
    ),
    cell: ({row}) =>
      row.original.price_cents === 0 ? (
        <Badge variant="secondary">
          <Trans message="Free" />
        </Badge>
      ) : (
        <span className="text-sm tabular-nums">
          {formatMoney(row.original.price_cents, row.original.currency)}
        </span>
      ),
  },
  {
    id: 'status',
    enableSorting: true,
    size: 130,
    header: ({column}) => (
      <SortableHeader column={column}>
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
        <div className="flex flex-col gap-0.5">
          <span className="inline-flex items-center gap-1 text-sm">
            <StarIcon className="size-3.5 text-amber-500" aria-hidden="true" />
            {total}
          </span>
          {hidden > 0 && (
            <span className="text-xs text-muted-foreground">
              <Trans message=":count hidden" values={{count: hidden}} />
            </span>
          )}
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
      <SortableHeader column={column}>
        <Trans message="Submitted" />
      </SortableHeader>
    ),
    cell: ({row}) =>
      row.original.created_at ? (
        <span className="text-sm text-muted-foreground">
          <FormattedDate date={row.original.created_at} />
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
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
      toast.success(<Trans message="Product approved." />);
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
      toast.success(<Trans message="Product rejected." />);
    },
    onError: error => showHttpErrorToast(error),
  });

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
            <EllipsisIcon className="size-4" />
          </Dropdown.Trigger>
          <Dropdown.Content align="end">
            <Dropdown.Item onClick={() => setDetailsOpen(true)}>
              <EyeIcon className="size-4" />
              <Trans message="Details" />
            </Dropdown.Item>
            <Dropdown.Item
              render={
                <Link to={`/admin/digital-products/${product.id}/reviews`} />
              }
            >
              <StarIcon className="size-4" />
              <Trans message="Reviews" />
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>
      </div>
      <Dialog.Root open={detailsOpen} onOpenChange={setDetailsOpen}>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Content className="sm:max-w-lg">
            <Dialog.Header>
              <Dialog.Title>
                <ShieldCheckIcon className="size-5" aria-hidden="true" />
                <Trans message="Review digital product" />
              </Dialog.Title>
              <Dialog.Description className="sr-only">
                <Trans message="Review and moderate this product" />
              </Dialog.Description>
            </Dialog.Header>
            <Dialog.Body className="space-y-4">
              <div>
                <h3 className="font-medium">{product.title}</h3>
                {product.description &&
                looksLikeHtml(product.description) ? (
                  <div
                    className="prose prose-sm mt-2 max-h-64 max-w-none overflow-y-auto text-muted-foreground dark:prose-invert"
                    dangerouslySetInnerHTML={{__html: product.description}}
                  />
                ) : (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {product.description}
                  </p>
                )}
              </div>
              <div className="rounded-md bg-muted p-3 text-sm">
                <p>
                  <Trans
                    message="Creator: :name"
                    values={{name: product.creator?.name ?? '—'}}
                  />
                </p>
                <p>
                  <Trans
                    message="Files: :count"
                    values={{count: product.files?.length ?? 0}}
                  />
                </p>
                <p>
                  <Trans
                    message="Price: :price"
                    values={{
                      price:
                        product.price_cents === 0
                          ? 'Free'
                          : formatMoney(product.price_cents, product.currency),
                    }}
                  />
                </p>
              </div>
              {product.status === 'rejected' && product.rejection_reason && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <Trans
                    message="Previously rejected: :reason"
                    values={{reason: product.rejection_reason}}
                  />
                </p>
              )}
              {product.status === 'pending_approval' && (
                <Field.Root>
                  <Field.Label htmlFor="rejection-reason">
                    <Trans message="Rejection reason (optional)" />
                  </Field.Label>
                  <Textarea
                    id="rejection-reason"
                    rows={3}
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                    placeholder="Explain what the creator should change."
                  />
                </Field.Root>
              )}
            </Dialog.Body>
            <Dialog.Footer>
              <Button
                variant="outline"
                onClick={() => setDetailsOpen(false)}
                disabled={approve.isPending || reject.isPending}
              >
                <Trans message="Close" />
              </Button>
              {product.status === 'pending_approval' && (
                <>
                  <Button
                    variant="outline"
                    color="danger"
                    disabled={reject.isPending}
                    onClick={() => reject.mutate()}
                  >
                    <XIcon className="size-4" />
                    <Trans message="Reject" />
                  </Button>
                  <Button
                    disabled={approve.isPending}
                    onClick={() => approve.mutate()}
                  >
                    <CheckIcon className="size-4" />
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
      <Badge variant="positive">
        <BadgeCheckIcon className="size-3.5" aria-hidden="true" />
        <Trans message="Approved" />
      </Badge>
    );
  }
  if (status === 'rejected') {
    return (
      <Badge variant="destructive">
        <XCircleIcon className="size-3.5" aria-hidden="true" />
        <Trans message="Rejected" />
      </Badge>
    );
  }
  if (status === 'draft') {
    return (
      <Badge variant="secondary">
        <FileIcon className="size-3.5" aria-hidden="true" />
        <Trans message="Draft" />
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
      <ClockIcon className="size-3.5" aria-hidden="true" />
      <Trans message="Pending" />
    </Badge>
  );
}

function looksLikeHtml(value: string) {
  return /<[a-z][\s\S]*>/i.test(value);
}

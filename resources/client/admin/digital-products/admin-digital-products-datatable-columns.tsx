import {apiClient} from '@common/http/query-client';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
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
  CheckIcon,
  EllipsisIcon,
  EyeIcon,
  FileIcon,
  ShieldCheckIcon,
  StarIcon,
  XIcon,
} from 'lucide-react';
import {useState} from 'react';
import {Link} from 'react-router';
import {
  looksLikeHtml,
  ProductStatusBadge,
  type AdminDigitalProduct,
} from './admin-digital-product-display';
import {adminDigitalProductsBaseKey} from './admin-digital-products-queries';

export const adminDigitalProductColumns: ColumnDef<AdminDigitalProduct>[] = [
  {
    id: 'select',
    size: 40,
    header: ({table}) => (
      <div className="flex justify-center">
        <Checkbox
          checked={
            (table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')) as any
          }
          onCheckedChange={value => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      </div>
    ),
    cell: ({row}) => (
      <div className="flex justify-center">
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={value => row.toggleSelected(!!value)}
          aria-label={`Select ${row.original.title}`}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: 'title',
    accessorKey: 'title',
    enableSorting: true,
    size: 260,
    header: ({column}) => (
      <SortableHeader column={column} className="p-0">
        <Button
          variant="ghost"
          className="flex h-8 items-center gap-1 px-2 font-medium"
        >
          <Trans message="Product" />
        </Button>
      </SortableHeader>
    ),
    cell: ({row}) => {
      const product = row.original;
      return (
        <div className="flex items-center gap-3 py-1">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border bg-muted">
            {product.cover?.url ? (
              <img
                src={product.cover.url}
                alt=""
                className="h-12 w-12 object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center">
                <FileIcon className="size-5 text-muted-foreground" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="min-w-0 max-w-[180px] sm:max-w-[220px]">
            <Link
              to={`/admin/digital-products/${product.id}`}
              className="line-clamp-2 text-sm font-medium leading-tight break-words hover:underline hover:underline-offset-3"
              title={product.title}
            >
              {product.title}
            </Link>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              SKU: {String(product.id).padStart(4, '0')} • {product.files?.length ?? 0} files
            </p>
          </div>
        </div>
      );
    },
  },
  {
    id: 'creator',
    size: 160,
    header: () => <span className="text-sm font-medium"><Trans message="Creator" /></span>,
    cell: ({row}) => {
      const creator = row.original.creator;
      return (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium leading-none">{creator?.name ?? '—'}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground" title={creator?.email}>
            {creator?.email ?? '—'}
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
      <SortableHeader column={column} className="justify-center p-0">
        <Button variant="ghost" className="flex h-8 items-center gap-1 px-2 font-medium">
          <Trans message="Price" />
        </Button>
      </SortableHeader>
    ),
    cell: ({row}) => (
      <div className="text-center">
        {row.original.price_cents === 0 ? (
          <Badge variant="secondary" className="font-medium">
            <Trans message="Free" />
          </Badge>
        ) : (
          <span className="text-sm font-medium tabular-nums">
            {formatMoney(row.original.price_cents, row.original.currency)}
          </span>
        )}
      </div>
    ),
  },
  {
    id: 'status',
    enableSorting: true,
    size: 120,
    header: ({column}) => (
      <SortableHeader column={column} className="justify-center p-0">
        <Button variant="ghost" className="flex h-8 items-center gap-1 px-2 font-medium">
          <Trans message="Status" />
        </Button>
      </SortableHeader>
    ),
    cell: ({row}) => (
      <div className="flex justify-center">
        <ProductStatusBadge
          status={row.original.status}
          hasPendingUpdate={row.original.has_pending_update}
        />
      </div>
    ),
  },
  {
    id: 'reviews',
    size: 100,
    header: ({column}) => (
      <SortableHeader column={column} className="justify-center p-0">
        <Button variant="ghost" className="flex h-8 items-center gap-1 px-2 font-medium">
          <Trans message="Rating" />
        </Button>
      </SortableHeader>
    ),
    cell: ({row}) => {
      const product = row.original;
      const total = product.reviews_count ?? 0;
      const hidden = product.hidden_reviews_count ?? 0;
      return (
        <div className="flex flex-col items-center">
          <span className="inline-flex items-center gap-1 text-sm">
            <StarIcon className="size-4 fill-primary text-primary" aria-hidden="true" />
            <span className="font-medium">{total === 0 ? '—' : total}</span>
            {total > 0 && (
              <span className="text-muted-foreground">({total})</span>
            )}
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
    size: 130,
    header: ({column}) => (
      <SortableHeader column={column} className="justify-center p-0">
        <Button variant="ghost" className="flex h-8 items-center gap-1 px-2 font-medium">
          <Trans message="Submitted" />
        </Button>
      </SortableHeader>
    ),
    cell: ({row}) => {
      const date = row.original.created_at;
      if (!date) return <span className="text-center text-sm text-muted-foreground">—</span>;
      return (
        <div className="text-center">
          <div className="text-sm font-medium">
            <FormattedDate date={date} />
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(date).toLocaleDateString()}
          </div>
        </div>
      );
    },
  },
  {
    id: 'actions',
    size: 60,
    header: () => <span className="sr-only"><Trans message="Actions" /></span>,
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
  const isUpdate = product.status === 'approved' && !!product.has_pending_update;
  const isActionable = product.status === 'pending_approval' || isUpdate;

  const approve = useMutation({
    mutationFn: () =>
      apiClient.post(`/api/v1/admin/items/${product.id}/approve`),
    onSuccess: () => {
      setDetailsOpen(false);
      queryClient.invalidateQueries({queryKey: adminDigitalProductsBaseKey});
      toast.success(<Trans message="Product approved." />);
    },
    onError: error => showHttpErrorToast(error),
  });

  const reject = useMutation({
    mutationFn: () =>
      apiClient.post(`/api/v1/admin/items/${product.id}/reject`, {
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
      <div className="flex justify-center">
        <Dropdown.Root>
          <Dropdown.Trigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-8 w-8"
                aria-label={`Actions for ${product.title}`}
              />
            }
          >
            <EllipsisIcon className="size-4" />
          </Dropdown.Trigger>
          <Dropdown.Content align="end">
            <Dropdown.Item
              render={
                <Link to={`/admin/digital-products/${product.id}`} />
              }
            >
              <EyeIcon className="size-4" />
              <Trans message="Details" />
            </Dropdown.Item>
            <Dropdown.Item onClick={() => setDetailsOpen(true)}>
              <ShieldCheckIcon className="size-4" />
              <Trans message="Quick review" />
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
              {isUpdate && (
                <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-300">
                  <Trans message="This update is live on the storefront until it is reviewed." />
                </p>
              )}
              {product.status === 'rejected' && product.rejection_reason && (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  <Trans
                    message="Previously rejected: :reason"
                    values={{reason: product.rejection_reason}}
                  />
                </p>
              )}
              {isActionable && (
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
              {isActionable && (
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

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
  status: 'pending_approval' | 'approved' | 'rejected';
  rejection_reason?: string | null;
  created_at?: string;
  creator?: {name: string; email: string};
  cover?: {url: string} | null;
  files?: Array<{id: number; name: string}>;
  reviews_count?: number;
  hidden_reviews_count?: number;
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
    cell: ({row}) => `#${row.original.id}`,
  },
  {
    id: 'title',
    accessorKey: 'title',
    size: 300,
    header: () => <Trans message="Product" />,
    cell: ({row}) => {
      const product = row.original;
      return (
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
          <div className="min-w-0">
            <p className="truncate font-medium">{product.title}</p>
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
          <p className="truncate font-medium">{creator?.name ?? '—'}</p>
          <p className="truncate text-xs text-muted-foreground">
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
    size: 100,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Price" />
      </SortableHeader>
    ),
    cell: ({row}) =>
      formatMoney(row.original.price_cents, row.original.currency),
  },
  {
    id: 'status',
    size: 120,
    header: () => <Trans message="Status" />,
    cell: ({row}) => <ProductStatusBadge status={row.original.status} />,
  },
  {
    id: 'reviews',
    size: 100,
    header: () => <Trans message="Reviews" />,
    cell: ({row}) => {
      const product = row.original;
      return (
        <div className="flex flex-col">
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
        <Trans message="Submitted Date" />
      </SortableHeader>
    ),
    cell: ({row}) =>
      row.original.created_at ? (
        <time>
          <FormattedDate date={row.original.created_at} />
        </time>
      ) : null,
  },
  {
    id: 'actions',
    size: 1,
    header: () => (
      <span className="hidden">
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
      <div className="flex justify-end text-muted-foreground">
        <Dropdown.Root>
          <Dropdown.Trigger render={<Button variant="ghost" size="icon-sm" />}>
            <EllipsisIcon />
          </Dropdown.Trigger>
          <Dropdown.Content align="end">
            <Dropdown.Item onClick={() => setDetailsOpen(true)}>
              <EyeIcon />
              <Trans message="Details" />
            </Dropdown.Item>
            <Dropdown.Item
              render={
                <Link to={`/admin/digital-products/${product.id}/reviews`} />
              }
            >
              <StarIcon />
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
                <ShieldCheckIcon />
                <Trans message="Review digital product" />
              </Dialog.Title>
            </Dialog.Header>
            <Dialog.Body>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold">{product.title}</p>
                  {product.description &&
                  looksLikeHtml(product.description) ? (
                    <div
                      className="prose prose-sm mt-1 max-h-64 max-w-none overflow-y-auto text-muted-foreground dark:prose-invert"
                      dangerouslySetInnerHTML={{__html: product.description}}
                    />
                  ) : (
                    <p className="mt-1 text-sm whitespace-pre-wrap text-muted-foreground">
                      {product.description}
                    </p>
                  )}
                </div>
                <div className="rounded-input bg-muted p-3 text-sm">
                  <p>
                    <Trans
                      message="Creator: :name"
                      values={{name: product.creator?.name ?? '—'}}
                    />
                  </p>
                  <p className="mt-1">
                    <Trans
                      message="Files: :count"
                      values={{count: product.files?.length ?? 0}}
                    />
                  </p>
                </div>
                {product.status === 'rejected' && product.rejection_reason && (
                  <p className="rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
                    <Trans
                      message="Previously rejected: :reason"
                      values={{reason: product.rejection_reason}}
                    />
                  </p>
                )}
                {product.status === 'pending_approval' && (
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
                onClick={() => setDetailsOpen(false)}
                disabled={approve.isPending || reject.isPending}
              >
                <Trans message="Close" />
              </Button>
              {product.status === 'pending_approval' && (
                <>
                  <Button
                    color="danger"
                    variant="outline"
                    disabled={reject.isPending}
                    onClick={() => reject.mutate()}
                  >
                    <XIcon />
                    <Trans message="Reject" />
                  </Button>
                  <Button
                    disabled={approve.isPending}
                    onClick={() => approve.mutate()}
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


function looksLikeHtml(value: string) {
  return /<[a-z][\s\S]*>/i.test(value);
}
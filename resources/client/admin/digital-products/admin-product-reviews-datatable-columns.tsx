import {apiClient} from '@common/http/query-client';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
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
import {Trans} from '@ui/i18n/trans';
import {
  EllipsisIcon,
  EyeIcon,
  EyeOffIcon,
  StarIcon,
  Trash2Icon,
} from 'lucide-react';
import {useState} from 'react';
import {adminProductReviewsBaseKey} from './admin-product-reviews-queries';

export type AdminProductReview = {
  id: number;
  stars: number | null;
  title: string | null;
  review: string | null;
  buyer_name: string | null;
  buyer_email: string | null;
  approved: boolean;
  hidden_at: string | null;
  hidden_reason: string | null;
  created_at: string | null;
  product?: {id: number; title: string} | null;
};

export const adminProductReviewColumns: ColumnDef<AdminProductReview>[] = [
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
    id: 'review',
    size: 300,
    header: () => <Trans message="Review" />,
    cell: ({row}) => {
      const review = row.original;
      return (
        <div className="min-w-0">
          <p className="truncate font-medium">{review.title ?? '—'}</p>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {review.review ?? '—'}
          </p>
          {review.hidden_reason && (
            <p className="mt-1 text-xs text-destructive">
              <Trans
                message="Reason: :reason"
                values={{reason: review.hidden_reason}}
              />
            </p>
          )}
        </div>
      );
    },
  },
  {
    id: 'buyer',
    size: 200,
    header: () => <Trans message="Buyer" />,
    cell: ({row}) => {
      const review = row.original;
      return (
        <div className="min-w-0">
          <p className="truncate font-medium">{review.buyer_name ?? '—'}</p>
          <p className="truncate text-xs text-muted-foreground">
            {review.buyer_email}
          </p>
        </div>
      );
    },
  },
  {
    id: 'rating',
    size: 120,
    header: () => <Trans message="Rating" />,
    cell: ({row}) => (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(star => (
          <StarIcon
            key={star}
            className={
              star <= (row.original.stars ?? 0)
                ? 'size-3.5 fill-current text-amber-500'
                : 'size-3.5 text-muted'
            }
          />
        ))}
      </div>
    ),
  },
  {
    id: 'status',
    size: 120,
    header: () => <Trans message="Status" />,
    cell: ({row}) => <ReviewStatusBadge review={row.original} />,
  },
  {
    id: 'created_at',
    accessorKey: 'created_at',
    enableSorting: true,
    size: 160,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Date" />
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
    cell: ({row}) => <ReviewActionsButton review={row.original} />,
  },
];

export function ReviewActionsButton({review}: {review: AdminProductReview}) {
  const queryClient = useQueryClient();
  const [hideDialogOpen, setHideDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const unhide = useMutation({
    mutationFn: () =>
      apiClient.post(
        `/api/v1/admin/digital-products/reviews/${review.id}/unhide`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({queryKey: adminProductReviewsBaseKey});
      toast.success(<Trans message="Review restored." />);
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
            {!review.hidden_at && (
              <Dropdown.Item onClick={() => setHideDialogOpen(true)}>
                <EyeOffIcon />
                <Trans message="Hide" />
              </Dropdown.Item>
            )}
            {review.hidden_at && (
              <Dropdown.Item onClick={() => unhide.mutate()}>
                <EyeIcon />
                <Trans message="Restore" />
              </Dropdown.Item>
            )}
            <Dropdown.Item
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2Icon />
              <Trans message="Delete" />
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>
      </div>
      <HideReviewDialog
        review={review}
        open={hideDialogOpen}
        onOpenChange={setHideDialogOpen}
      />
      <DeleteReviewDialog
        review={review}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  );
}

type ReviewDialogProps = {
  review: AdminProductReview;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function HideReviewDialog({review, open, onOpenChange}: ReviewDialogProps) {
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');

  const hide = useMutation({
    mutationFn: () =>
      apiClient.post(
        `/api/v1/admin/digital-products/reviews/${review.id}/hide`,
        {reason: reason.trim() || undefined},
      ),
    onSuccess: () => {
      onOpenChange(false);
      setReason('');
      queryClient.invalidateQueries({queryKey: adminProductReviewsBaseKey});
      toast.success(<Trans message="Review hidden." />);
    },
    onError: error => showHttpErrorToast(error),
  });

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="sm:max-w-md">
          <Dialog.Header>
            <Dialog.Title>
              <EyeOffIcon />
              <Trans message="Hide review" />
            </Dialog.Title>
            <Dialog.Description>
              <Trans message="Hidden reviews no longer appear on the public product page." />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body>
            <Field.Root>
              <Field.Label>
                <Trans message="Reason (optional)" />
              </Field.Label>
              <Textarea
                rows={3}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Contains inaccurate claims…"
              />
            </Field.Root>
          </Dialog.Body>
          <Dialog.Footer>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={hide.isPending}
            >
              <Trans message="Cancel" />
            </Button>
            <Button
              color="danger"
              disabled={hide.isPending}
              onClick={() => hide.mutate()}
            >
              <EyeOffIcon />
              <Trans message="Hide review" />
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DeleteReviewDialog({review, open, onOpenChange}: ReviewDialogProps) {
  const queryClient = useQueryClient();

  const remove = useMutation({
    mutationFn: () =>
      apiClient.delete(`/api/v1/admin/digital-products/reviews/${review.id}`),
    onSuccess: () => {
      onOpenChange(false);
      queryClient.invalidateQueries({queryKey: adminProductReviewsBaseKey});
      toast.success(<Trans message="Review deleted." />);
    },
    onError: error => showHttpErrorToast(error),
  });

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Media className="bg-destructive/10 text-destructive">
              <Trash2Icon />
            </AlertDialog.Media>
            <AlertDialog.Title>
              <Trans message="Delete this review?" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="This removes the review permanently. This action cannot be undone." />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={remove.isPending}
              onClick={() => remove.mutate()}
            >
              <Trans message="Delete" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export function ReviewStatusBadge({review}: {review: AdminProductReview}) {
  if (review.hidden_at) {
    return (
      <Badge variant="destructive">
        <EyeOffIcon />
        <Trans message="Hidden" />
      </Badge>
    );
  }
  return (
    <Badge variant="positive">
      <EyeIcon />
      <Trans message="Visible" />
    </Badge>
  );
}
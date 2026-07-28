import {Product} from '@app/gen/schemas/product';
import {deleteProductOptions} from '@common/admin/subscriptions/products-queries';
import {FormattedPrice} from '@common/billing/formatted-price';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {SortableHeader} from '@shadcn/table/utils/sortable-header';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {ColumnDef} from '@tanstack/react-table';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {EditIcon, EllipsisIcon, TrashIcon} from 'lucide-react';
import {useState} from 'react';
import {Link} from 'react-router';

export const plansDatatableColumns: ColumnDef<Product>[] = [
  {
    id: 'name',
    accessorKey: 'name',
    enableSorting: true,
    size: 250,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Name" />
      </SortableHeader>
    ),
    cell: ({row}) => {
      const product = row.original;
      const price = product.prices?.[0];

      return (
        <div>
          <div className="mb-0.5 font-medium">{product.name}</div>
          <div className="text-xs text-muted-foreground">
            {product.free ? (
              <Trans message="Free" />
            ) : (
              <FormattedPrice price={price} />
            )}
          </div>
        </div>
      );
    },
  },
  {
    id: 'created_at',
    accessorKey: 'created_at',
    enableSorting: true,
    size: 1,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Created" />
      </SortableHeader>
    ),
    cell: ({row}) => (
      <time>
        <FormattedDate date={row.original.created_at} />
      </time>
    ),
  },
  {
    id: 'actions',
    size: 1,
    header: () => (
      <span className="hidden">
        <Trans message="Actions" />
      </span>
    ),
    cell: ({row}) => <PlanActions product={row.original} />,
  },
];

function PlanActions({product}: {product: Product}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <div className="flex justify-end text-muted-foreground">
        <Dropdown.Root>
          <Dropdown.Trigger render={<Button variant="ghost" size="icon-sm" />}>
            <EllipsisIcon />
          </Dropdown.Trigger>
          <Dropdown.Content align="end">
            <Dropdown.LinkItem
              render={<Link to={`/admin/plans/${product.id}/edit`} />}
            >
              <EditIcon />
              <Trans message="Edit plan" />
            </Dropdown.LinkItem>
            <Dropdown.Item
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <TrashIcon />
              <Trans message="Delete plan" />
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>
      </div>
      <DeletePlanDialog
        product={product}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
    </>
  );
}

function DeletePlanDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const deleteProduct = useMutation(deleteProductOptions());

  const handleDelete = () => {
    deleteProduct.mutate(product.id, {
      onSuccess: () => {
        onOpenChange(false);
        toast.success(<Trans message="Plan deleted" />);
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Title>
              <Trans message="Delete plan" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="Are you sure you want to delete this plan?" />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={deleteProduct.isPending}
              onClick={() => handleDelete()}
            >
              <Trans message="Delete" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

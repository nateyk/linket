import {
  deleteHelpCategoryOptions,
  listHelpCategoriesOptions,
  sortHelpCategoriesOptions,
} from '@common/admin/help/help-admin-queries';
import {CategoryFormDialog} from '@common/admin/help/category-form-dialog';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {HelpCategory} from '@common/help/help-queries';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Trans} from '@ui/i18n/trans';
import {useSortable} from '@ui/interactions/dnd/sortable/use-sortable';
import {moveItemInNewArray} from '@ui/utils/array/move-item-in-new-array';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {GripVerticalIcon, PencilIcon, PlusIcon, TrashIcon} from 'lucide-react';
import {RefObject, useRef, useState} from 'react';

export function HelpCategoriesTab() {
  const {data: categories} = useSuspenseQuery(listHelpCategoriesOptions());
  const sortCategories = useMutation(sortHelpCategoriesOptions());

  const handleSortEnd = (oldIndex: number, newIndex: number) => {
    const ordered = moveItemInNewArray(categories ?? [], oldIndex, newIndex);
    sortCategories.mutate(
      ordered.map(c => c.id),
      {onError: err => showHttpErrorToast(err)},
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          <Trans message="Drag categories to reorder them." />
        </p>
        <CategoryFormDialog>
          <Dialog.Trigger
            render={
              <Button size="sm">
                <PlusIcon />
                <Trans message="New category" />
              </Button>
            }
          />
        </CategoryFormDialog>
      </div>
      <div className="flex flex-col gap-2">
        {(categories ?? []).map(category => (
          <CategoryRow
            key={category.id}
            category={category}
            items={categories ?? []}
            onSortEnd={handleSortEnd}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryRow({
  category,
  items,
  onSortEnd,
}: {
  category: HelpCategory & {articles_count?: number};
  items: (HelpCategory & {articles_count?: number})[];
  onSortEnd: (oldIndex: number, newIndex: number) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const {sortableProps, dragHandleRef} = useSortable({
    item: category,
    items,
    type: 'helpCategoriesSortable',
    ref: ref as RefObject<HTMLElement | null>,
    onSortEnd,
    strategy: 'liveSort',
  });
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <>
      <Card.Root
        ref={ref}
        {...sortableProps}
        className="flex items-center gap-2 p-3"
      >
        <button
          type="button"
          ref={dragHandleRef as RefObject<HTMLButtonElement | null>}
          className="cursor-grab touch-none text-muted-foreground"
          aria-label="Reorder"
        >
          <GripVerticalIcon className="size-5" />
        </button>
        <div className="flex-1">
          <div className="font-medium">{category.name}</div>
          <div className="text-sm text-muted-foreground">
            <Trans
              message=":count articles"
              values={{count: category.articles_count ?? 0}}
            />
          </div>
        </div>
        <CategoryFormDialog category={category}>
          <Dialog.Trigger
            render={
              <Button variant="outline" size="icon-sm">
                <PencilIcon />
              </Button>
            }
          />
        </CategoryFormDialog>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setDeleteOpen(true)}
        >
          <TrashIcon />
        </Button>
      </Card.Root>
      <DeleteCategoryDialog
        category={category}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </>
  );
}

function DeleteCategoryDialog({
  category,
  open,
  onOpenChange,
}: {
  category: HelpCategory;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const deleteCategory = useMutation(deleteHelpCategoryOptions());

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Title>
              <Trans message="Delete category" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="Are you sure you want to delete this category?" />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel disabled={deleteCategory.isPending}>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={deleteCategory.isPending}
              onClick={() =>
                deleteCategory.mutate(category.id, {
                  onSuccess: () => onOpenChange(false),
                  onError: err => showHttpErrorToast(err),
                })
              }
            >
              <Trans message="Delete" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

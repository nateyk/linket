import {blogAdminQueries} from '@common/admin/blog/blog-admin-queries';
import {BlogCategoryFormDialog} from '@common/admin/blog/blog-category-form-dialog';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Item} from '@shadcn/item/item';
import {TableSearchInput} from '@shadcn/table/utils/table-search-input';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useQueryClient, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useFilter} from '@ui/i18n/use-filter';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {useSettings} from '@ui/settings/use-settings';
import {useMemo, useState} from 'react';
import {PlusIcon, TrashIcon, EditIcon, EllipsisIcon, NewspaperIcon} from 'lucide-react';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';

export function BlogCategoriesTab() {
  const {searchParams} = useTableQueryState();
  const filter = useFilter({sensitivity: 'base'});

  const query = useSuspenseQuery(blogAdminQueries.categoriesList(searchParams));
  const items = query.data?.data ?? [];

  const filteredItems = useMemo(() => {
    if (!searchParams.query) {
      return items;
    }
    return items.filter((item: any) =>
      filter.contains(item.name ?? '', searchParams.query as string),
    );
  }, [items, searchParams.query, filter]);

  return (
    <DashboardLayout.MainSection>
      <StaticPageTitle>
        <Trans message="Blog Categories" />
      </StaticPageTitle>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <h1><Trans message="Blog Categories" /></h1>
        </DashboardLayout.SectionTitle>
        <BlogCategoryFormDialog>
          <Button variant="default" color="primary">
            <PlusIcon />
            <Trans message="New category" />
          </Button>
        </BlogCategoryFormDialog>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent>
        <DashboardLayout.SectionContentHeader>
          <TableSearchInput className="mr-auto" debounce={false} />
        </DashboardLayout.SectionContentHeader>
        <DashboardLayout.SectionScrollContainer className="flex flex-col gap-4">
          {filteredItems.map((category: any) => (
            <BlogCategoryCard key={category.id} category={category} />
          ))}
          {filteredItems.length === 0 && (
            <BlogCategoriesEmptyState isFiltering={!!searchParams.query} />
          )}
        </DashboardLayout.SectionScrollContainer>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function BlogCategoriesEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <NewspaperIcon className="size-12 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-medium text-muted-foreground">
        {isFiltering
          ? <Trans message="No matching categories" />
          : <Trans message="No categories have been created yet" />}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {isFiltering
          ? <Trans message="Try another search query." />
          : <Trans message="Get started by adding your first blog category." />}
      </p>
      {!isFiltering && (
        <BlogCategoryFormDialog>
          <Button variant="default" color="primary" className="mt-4">
            <PlusIcon />
            <Trans message="New category" />
          </Button>
        </BlogCategoryFormDialog>
      )}
    </div>
  );
}

function BlogCategoryCard({category}: {category: any}) {
  return (
    <Item.Root variant="outline">
      <Item.Media align="center" className="size-9.5 rounded-full border">
        <NewspaperIcon className="size-4" />
      </Item.Media>
      <Item.Content>
        <Item.Title>{category.name}</Item.Title>
        <Item.Description className="flex items-center gap-3">
          <span>
            <Trans message=":count articles" values={{count: category.articles_count ?? 0}} />
          </span>
          <span className="text-muted-foreground">·</span>
          <span>
            <Trans message="Created: " />
            <FormattedDate date={category.created_at} />
          </span>
        </Item.Description>
      </Item.Content>
      <Item.Actions>
        <BlogCategoryActionsButton category={category} />
      </Item.Actions>
    </Item.Root>
  );
}

function BlogCategoryActionsButton({category}: {category: any}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <DeleteBlogCategoryDialog
        categoryId={category.id}
        categoryName={category.name}
        articleCount={category.articles_count ?? 0}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
      <Dropdown.Root>
        <Dropdown.Trigger render={<Button variant="ghost" size="icon" />}>
          <EllipsisIcon />
        </Dropdown.Trigger>
        <Dropdown.Content align="end">
          <BlogCategoryFormDialog category={category}>
            <Dropdown.Item>
              <EditIcon />
              <Trans message="Edit" />
            </Dropdown.Item>
          </BlogCategoryFormDialog>
          <Dropdown.Item
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <TrashIcon />
            <Trans message="Delete" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </>
  );
}

type DeleteBlogCategoryDialogProps = {
  categoryId: number;
  categoryName: string;
  articleCount: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DeleteBlogCategoryDialog({
  categoryId,
  categoryName,
  articleCount,
  open,
  onOpenChange,
}: DeleteBlogCategoryDialogProps) {
  const deleteCategory = useMutation(blogAdminQueries.deleteCategory());
  const queryClient = useQueryClient();

  const handleDelete = () => {
    deleteCategory.mutate(categoryId, {
      onSuccess: () => {
        toast.success(<Trans message="Category deleted" />);
        onOpenChange(false);
        queryClient.invalidateQueries({queryKey: ['blog']});
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
              <Trans message="Delete category" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              {articleCount > 0 ? (
                <Trans
                  message="This category contains {count} articles. Deleting it will also delete all of them. This cannot be undone."
                  values={{count: articleCount}}
                />
              ) : (
                <Trans message="Are you sure you want to delete this category?" />
              )}
              <p className="mt-2 font-medium">{categoryName}</p>
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel disabled={deleteCategory.isPending}>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={deleteCategory.isPending}
              onClick={handleDelete}
            >
              <Trans message="Delete" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
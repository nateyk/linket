import {blogAdminQueries} from '@common/admin/blog/blog-admin-queries';
import {BlogArticleFormDialog} from '@common/admin/blog/blog-article-form-dialog';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Item} from '@shadcn/item/item';
import {TableSearchInput} from '@shadcn/table/utils/table-search-input';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useFilter} from '@ui/i18n/use-filter';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {useSettings} from '@ui/settings/use-settings';
import {useMemo} from 'react';
import {DeleteIcon, EditIcon, EllipsisIcon, EyeIcon, NewspaperIcon, PlusIcon} from 'lucide-react';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {useState} from 'react';

export function BlogArticlesDatatablePage() {
  const {base_url} = useSettings();
  const {searchParams} = useTableQueryState();
  const filter = useFilter({sensitivity: 'base'});

  const query = useSuspenseQuery(blogAdminQueries.articlesList(searchParams));
  const items = query.data?.data ?? [];

  const filteredItems = useMemo(() => {
    if (!searchParams.query) {
      return items;
    }
    return items.filter((item: any) =>
      filter.contains(item.title ?? '', searchParams.query as string),
    );
  }, [items, searchParams.query, filter]);

  return (
    <DashboardLayout.SectionContent>
      <DashboardLayout.SectionContentHeader>
        <TableSearchInput className="mr-auto" debounce={false} />
        <BlogArticleFormDialog>
          <Button variant="default" color="primary">
            <PlusIcon />
            <Trans message="New article" />
          </Button>
        </BlogArticleFormDialog>
      </DashboardLayout.SectionContentHeader>
        <DashboardLayout.SectionScrollContainer className="flex flex-col gap-4">
          {filteredItems.map((article: any) => (
            <BlogArticleCard key={article.id} article={article} baseUrl={base_url} />
          ))}
          {filteredItems.length === 0 && (
            <BlogArticlesEmptyState isFiltering={!!searchParams.query} />
          )}
        </DashboardLayout.SectionScrollContainer>
    </DashboardLayout.SectionContent>
  );
}

function BlogArticlesEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <NewspaperIcon className="size-12 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-medium text-muted-foreground">
        {isFiltering
          ? <Trans message="No matching articles" />
          : <Trans message="No articles have been created yet" />}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {isFiltering
          ? <Trans message="Try another search query." />
          : <Trans message="Get started by adding your first blog article." />}
      </p>
      {!isFiltering && (
        <BlogArticleFormDialog>
          <Button variant="default" color="primary" className="mt-4">
            <PlusIcon />
            <Trans message="New article" />
          </Button>
        </BlogArticleFormDialog>
      )}
    </div>
  );
}

function BlogArticleCard({article, baseUrl}: {article: any; baseUrl: string}) {
  return (
    <Item.Root variant="outline">
      <Item.Media align="center" className="size-9.5 rounded-full border">
        <NewspaperIcon className="size-4" />
      </Item.Media>
      <Item.Content>
        <Item.Title>
          <a
            className="hover:underline"
            target="_blank"
            href={`${baseUrl}/blog/${article.slug}`}
          >
            {article.title}
          </a>
        </Item.Title>
        <Item.Description className="flex items-center gap-3">
          <span>
            <Trans message="Published: " />
            <FormattedDate date={article.published_at} />
          </span>
          {article.category && (
            <>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground capitalize">
                {article.category.name}
              </span>
            </>
          )}
          <span className="text-muted-foreground">·</span>
          <span className="text-xs text-muted-foreground">
            <Trans message=":count views" values={{count: article.views}} />
          </span>
        </Item.Description>
      </Item.Content>
      <Item.Actions>
        <BlogArticleActionsButton article={article} baseUrl={baseUrl} />
      </Item.Actions>
    </Item.Root>
  );
}

function BlogArticleActionsButton({article, baseUrl}: {article: any; baseUrl: string}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <DeleteBlogArticleDialog
        articleId={article.id}
        articleTitle={article.title}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
      <Dropdown.Root>
        <Dropdown.Trigger render={<Button variant="ghost" size="icon" />}>
          <EllipsisIcon />
        </Dropdown.Trigger>
        <Dropdown.Content align="end">
          <Dropdown.LinkItem
            href={`${baseUrl}/blog/${article.slug}`}
            target="_blank"
          >
            <EyeIcon />
            <Trans message="Preview" />
          </Dropdown.LinkItem>
          <BlogArticleFormDialog article={article}>
            <Dropdown.Item>
              <EditIcon />
              <Trans message="Edit" />
            </Dropdown.Item>
          </BlogArticleFormDialog>
          <Dropdown.Item
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <DeleteIcon />
            <Trans message="Delete" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </>
  );
}

type DeleteBlogArticleDialogProps = {
  articleId: number;
  articleTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DeleteBlogArticleDialog({
  articleId,
  articleTitle,
  open,
  onOpenChange,
}: DeleteBlogArticleDialogProps) {
  const deleteArticle = useMutation(blogAdminQueries.deleteArticle());

  const handleDelete = () => {
    deleteArticle.mutate(articleId, {
      onSuccess: () => {
        toast.success(<Trans message="Article deleted" />);
        onOpenChange(false);
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
              <Trans message="Delete article" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="Are you sure you want to delete this article?" />
              <p className="mt-2 font-medium">{articleTitle}</p>
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel disabled={deleteArticle.isPending}>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={deleteArticle.isPending}
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
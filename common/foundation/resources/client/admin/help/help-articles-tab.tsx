import {
  deleteHelpArticleOptions,
  listHelpArticlesOptions,
  listHelpCategoriesOptions,
} from '@common/admin/help/help-admin-queries';
import {ArticleFormDialog} from '@common/admin/help/article-form-dialog';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {HelpArticle} from '@common/help/help-queries';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Trans} from '@ui/i18n/trans';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {FileTextIcon, PencilIcon, PlusIcon, TrashIcon} from 'lucide-react';
import {useState} from 'react';
import {useDebouncedCallback} from 'use-debounce';

export function HelpArticlesTab() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const debouncedSetSearch = useDebouncedCallback(setDebouncedSearch, 300);

  const {data: categories} = useSuspenseQuery(listHelpCategoriesOptions());
  const {data: articles} = useSuspenseQuery(
    listHelpArticlesOptions({
      search: debouncedSearch || undefined,
      category: categoryId,
    }),
  );

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center">
        <Input
          value={search}
          onChange={e => {
            setSearch(e.target.value);
            debouncedSetSearch(e.target.value);
          }}
          placeholder="Search articles..."
          className="md:max-w-64"
        />
        <Select.Root
          items={[
            {value: 0, label: 'All categories'},
            ...(categories ?? []).map(c => ({value: c.id, label: c.name})),
          ]}
          value={categoryId ?? 0}
          onValueChange={value =>
            setCategoryId(Number(value) ? Number(value) : undefined)
          }
        >
          <Select.Trigger className="md:w-56">
            <Select.Value />
          </Select.Trigger>
          <Select.Content>
            <Select.Item value={0}>All categories</Select.Item>
            {(categories ?? []).map(c => (
              <Select.Item key={c.id} value={c.id}>
                {c.name}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
        <ArticleFormDialog>
          <Dialog.Trigger
            render={
              <Button size="sm" className="md:ml-auto">
                <PlusIcon />
                <Trans message="New article" />
              </Button>
            }
          />
        </ArticleFormDialog>
      </div>
      <div className="flex flex-col gap-2">
        {(articles ?? []).map(article => (
          <ArticleRow key={article.id} article={article} />
        ))}
        {(articles ?? []).length === 0 && (
          <Card.Root className="p-10 text-center">
            <span className="text-muted-foreground">
              <Trans message="No articles found" />
            </span>
          </Card.Root>
        )}
      </div>
    </div>
  );
}

function ArticleRow({article}: {article: HelpArticle}) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteArticle = useMutation(deleteHelpArticleOptions());

  return (
    <>
      <Card.Root className="flex items-center gap-2 p-3">
        <FileTextIcon className="size-5 shrink-0 text-muted-foreground" />
        <div className="flex-1">
          <div className="font-medium">{article.title}</div>
          <div className="text-sm text-muted-foreground">
            {article.category?.name ?? ''}
          </div>
        </div>
        <ArticleFormDialog article={article}>
          <Dialog.Trigger
            render={
              <Button variant="outline" size="icon-sm">
                <PencilIcon />
              </Button>
            }
          />
        </ArticleFormDialog>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => setDeleteOpen(true)}
        >
          <TrashIcon />
        </Button>
      </Card.Root>
      <AlertDialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Content size="sm">
            <AlertDialog.Header>
              <AlertDialog.Title>
                <Trans message="Delete article" />
              </AlertDialog.Title>
              <AlertDialog.Description>
                <Trans message="Are you sure you want to delete this article?" />
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel disabled={deleteArticle.isPending}>
                <Trans message="Cancel" />
              </AlertDialog.Cancel>
              <AlertDialog.Action
                color="danger"
                disabled={deleteArticle.isPending}
                onClick={() =>
                  deleteArticle.mutate(article.id, {
                    onSuccess: () => setDeleteOpen(false),
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
    </>
  );
}

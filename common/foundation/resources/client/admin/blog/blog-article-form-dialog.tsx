import {
  blogAdminQueries,
  updateBlogArticleOptions,
} from '@common/admin/blog/blog-admin-queries';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {TipTapEditorProvider} from '@common/text-editor/tiptap-editor-provider';
import {articleEditorTipTapExtensions} from '@common/article-editor/article-editor-tiptap-extensions';
import {TiptapEditorContent} from '@common/text-editor/tiptap-editor-content';
import {FormatDropdown} from '@common/text-editor/menubar/format-dropdown';
import {Divider} from '@common/text-editor/menubar/divider';
import {FontStyleButtons} from '@common/text-editor/menubar/font-style-buttons';
import {AlignButtons} from '@common/text-editor/menubar/align-buttons';
import {ListButtons} from '@common/text-editor/menubar/list-buttons';
import {LinkButton} from '@common/text-editor/menubar/link-button';
import {CodeBlockMenuTrigger} from '@common/text-editor/menubar/code-block-menu-trigger';
import {ClearFormatButton} from '@common/text-editor/menubar/clear-format-button';
import {HistoryButtons} from '@common/text-editor/history-buttons';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {slugifyString} from '@ui/utils/string/slugify-string';
import {ReactElement, useState} from 'react';
import {useForm, useWatch} from 'react-hook-form';

interface BlogArticlePayload {
  title: string;
  slug?: string;
  excerpt?: string;
  body: string;
  blog_category_id: number;
  cover_image?: string;
  meta_title?: string;
  meta_description?: string;
  status: 'draft' | 'published';
  published_at?: string;
}

interface Props {
  children: ReactElement<typeof Dialog.Trigger>;
  article?: any;
}

function BlogArticleFormDialog({children, article}: Props) {
  const [open, setOpen] = useState(false);
  const isEditing = !!article;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        {open && (
          <DialogContent
            key={article?.id ?? 'new'}
            article={article}
            title={isEditing ? <Trans message="Edit article" /> : <Trans message="New article" />}
            submitLabel={isEditing ? <Trans message="Save" /> : <Trans message="Create" />}
            onClose={() => setOpen(false)}
          />
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  article,
  title,
  submitLabel,
  onClose,
}: {
  article?: any;
  title: React.ReactNode;
  submitLabel: React.ReactNode;
  onClose: () => void;
}) {
  const {data: categories} = useSuspenseQuery(blogAdminQueries.categoriesList());

  const form = useForm<BlogArticlePayload>({
    defaultValues: {
      title: article?.title ?? '',
      slug: article?.slug ?? '',
      excerpt: article?.excerpt ?? '',
      body: article?.body ?? '',
      blog_category_id: article?.blog_category_id ?? categories?.[0]?.id,
      cover_image: article?.cover_image ?? '',
      meta_title: article?.meta_title ?? '',
      meta_description: article?.meta_description ?? '',
      status: article?.status ?? 'draft',
      published_at: article?.published_at ?? '',
    },
  });

  const titleValue = useWatch({control: form.control, name: 'title'});
  const bodyValue = useWatch({control: form.control, name: 'body'});

  const createArticle = useMutation(blogAdminQueries.createArticle());
  const updateArticle = useMutation(
    updateBlogArticleOptions(article?.id ?? 0),
  );
  const mutation = article ? updateArticle : createArticle;

  const handleSubmit = (values: BlogArticlePayload) => {
    mutation.mutate(
      {
        ...values,
        slug: values.slug || slugifyString(values.title, '-', true),
      },
      {
        onSuccess: () => {
          toast.success(
            <Trans message={article ? 'Article updated' : 'Article created'} />,
          );
          onClose();
        },
        onError: err => onFormQueryError(err, form),
      },
    );
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content className="sm:max-w-4xl">
        <Dialog.Header>
          <Dialog.Title>{title}</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <HookForm.Field name="title">
              <Field.Label>
                <Trans message="Title" />
              </Field.Label>
              <Input required autoFocus />
              <Field.Error />
            </HookForm.Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <HookForm.Field name="slug">
                <Field.Label>
                  <Trans message="Slug" />
                </Field.Label>
                <Input
                  placeholder={slugifyString(titleValue ?? '', '-', true)}
                />
                <Field.Error />
              </HookForm.Field>

              <HookForm.Field name="blog_category_id">
                <Field.Label>
                  <Trans message="Category" />
                </Field.Label>
                <Select.Root
                  items={(categories ?? []).map((c: any) => ({
                    value: c.id,
                    label: c.name,
                  }))}
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {(categories ?? []).map((c: any) => (
                      <Select.Item key={c.id} value={c.id}>
                        {c.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                <Field.Error />
              </HookForm.Field>
            </div>

            <HookForm.Field name="excerpt">
              <Field.Label>
                <Trans message="Excerpt" />
              </Field.Label>
              <Textarea rows={3} maxLength={500} />
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field name="body">
              <Field.Label>
                <Trans message="Body" />
              </Field.Label>
              <TipTapEditorProvider
                extensions={articleEditorTipTapExtensions}
                initialContent={bodyValue ?? ''}
                onChange={html => form.setValue('body', html, {shouldDirty: true})}
              >
                <div className="overflow-hidden rounded-card border bg-background">
                  <div className="no-scrollbar flex shrink-0 items-center overflow-x-auto border-b px-1 py-0.5 text-muted-foreground">
                    <FormatDropdown />
                    <Divider />
                    <FontStyleButtons />
                    <Divider />
                    <AlignButtons />
                    <Divider />
                    <ListButtons />
                    <Divider />
                    <LinkButton />
                    <Divider />
                    <CodeBlockMenuTrigger />
                    <ClearFormatButton />
                    <Divider />
                    <HistoryButtons />
                  </div>
                  <TiptapEditorContent className="prose max-w-none p-4 focus:outline-none dark:prose-invert [&_.tiptap]:min-h-60" />
                </div>
              </TipTapEditorProvider>
              <Field.Error />
            </HookForm.Field>

            <div className="border-t pt-6 space-y-4">
              <h4 className="text-sm font-medium">
                <Trans message="SEO Overrides" />
              </h4>
              <p className="text-xs text-muted-foreground">
                <Trans message="Optional. Leave empty to use the article title and excerpt for SEO." />
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <HookForm.Field name="meta_title">
                  <Field.Label>
                    <Trans message="Meta title" />
                  </Field.Label>
                  <Input />
                  <Field.Error />
                </HookForm.Field>
                <HookForm.Field name="meta_description">
                  <Field.Label>
                    <Trans message="Meta description" />
                  </Field.Label>
                  <Input />
                  <Field.Error />
                </HookForm.Field>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4 pt-4">
              <HookForm.Field name="status">
                <Field.Label>
                  <Trans message="Status" />
                </Field.Label>
                <Select.Root items={[
                  {value: 'draft', label: <Trans message="Draft" />},
                  {value: 'published', label: <Trans message="Published" />},
                ]}>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="draft"><Trans message="Draft" /></Select.Item>
                    <Select.Item value="published"><Trans message="Published" /></Select.Item>
                  </Select.Content>
                </Select.Root>
                <Field.Error />
              </HookForm.Field>

              <HookForm.Field name="published_at">
                <Field.Label>
                  <Trans message="Published at" />
                </Field.Label>
                <Input type="datetime-local" step="60" />
                <Field.Description>
                  <Trans message="Leave empty to publish immediately when status is Published." />
                </Field.Description>
                <Field.Error />
              </HookForm.Field>

              <HookForm.Field name="cover_image">
                <Field.Label>
                  <Trans message="Cover image URL" />
                </Field.Label>
                <Input placeholder="https://example.com/image.jpg" />
                <Field.Description>
                  <Trans message="Optional. Used for social sharing and article cards." />
                </Field.Description>
                <Field.Error />
              </HookForm.Field>
            </div>
          </Field.Group>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={mutation.isPending}>
            {submitLabel}
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

export {BlogArticleFormDialog, DialogContent};
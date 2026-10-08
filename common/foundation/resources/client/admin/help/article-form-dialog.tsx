import {
  createHelpArticleOptions,
  listHelpCategoriesOptions,
  updateHelpArticleOptions,
} from '@common/admin/help/help-admin-queries';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {HelpArticle} from '@common/help/help-queries';
import {HelpArticleEditor} from '@common/help/components/help-article-editor';
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

interface Payload {
  title: string;
  slug?: string;
  help_category_id: number;
  body: string;
  short_description: string;
}

interface Props {
  children: ReactElement<typeof Dialog.Trigger>;
  article?: HelpArticle;
}

export function ArticleFormDialog({children, article}: Props) {
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
            title={isEditing ? 'Edit article' : 'New article'}
            submitLabel={isEditing ? 'Save' : 'Create'}
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
  article?: HelpArticle;
  title: string;
  submitLabel: string;
  onClose: () => void;
}) {
  const {data: categories} = useSuspenseQuery(listHelpCategoriesOptions());
  const form = useForm<Payload>({
    defaultValues: {
      title: article?.title ?? '',
      slug: article?.slug ?? '',
      help_category_id:
        article?.help_category_id ?? categories?.[0]?.id,
      body: article?.body ?? '',
      short_description: article?.short_description ?? '',
    },
  });
  const titleValue = useWatch({control: form.control, name: 'title'});
  const bodyValue = useWatch({control: form.control, name: 'body'});

  const createArticle = useMutation(createHelpArticleOptions());
  const updateArticle = useMutation(
    updateHelpArticleOptions(article?.id ?? 0),
  );
  const mutation = article ? updateArticle : createArticle;

  const handleSubmit = (values: Payload) => {
    mutation.mutate(
      {
        ...values,
        slug: values.slug || slugifyString(values.title, '-', true),
      },
      {
        onSuccess: () => {
          toast.success(
            <Trans
              message={article ? 'Article updated' : 'Article created'}
            />,
          );
          onClose();
        },
        onError: err => onFormQueryError(err, form),
      },
    );
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content className="sm:max-w-3xl">
        <Dialog.Header>
          <Dialog.Title>
            <Trans message={title} />
          </Dialog.Title>
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
              <HookForm.Field name="help_category_id">
                <Field.Label>
                  <Trans message="Category" />
                </Field.Label>
                <Select.Root
                  items={(categories ?? []).map(c => ({
                    value: c.id,
                    label: c.name,
                  }))}
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {(categories ?? []).map(c => (
                      <Select.Item key={c.id} value={c.id}>
                        {c.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
                <Field.Error />
              </HookForm.Field>
            </div>
            <HookForm.Field name="short_description">
              <Field.Label>
                <Trans message="Short description" />
              </Field.Label>
              <Textarea required rows={2} maxLength={200} />
              <Field.Error />
            </HookForm.Field>
            <HookForm.Field name="body">
              <Field.Label>
                <Trans message="Body" />
              </Field.Label>
              <HelpArticleEditor
                value={bodyValue ?? ''}
                onChange={html =>
                  form.setValue('body', html, {shouldDirty: true})
                }
              />
              <Field.Error />
            </HookForm.Field>
          </Field.Group>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={mutation.isPending}>
            <Trans message={submitLabel} />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

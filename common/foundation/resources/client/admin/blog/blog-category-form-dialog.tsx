import {
  blogAdminQueries,
  createBlogCategoryOptions,
  updateBlogCategoryOptions,
} from '@common/admin/blog/blog-admin-queries';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input'
import {Select} from '@shadcn/forms/select/select';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {slugifyString} from '@ui/utils/string/slugify-string';
import {ReactElement, useState} from 'react';
import {useForm, useWatch} from 'react-hook-form';

interface BlogCategoryPayload {
  name: string;
  slug?: string;
  description?: string;
  sort_id: number;
}

interface Props {
  children: ReactElement<typeof Dialog.Trigger>;
  category?: any;
}

export function BlogCategoryFormDialog({children, category}: Props) {
  const [open, setOpen] = useState(false);
  const isEditing = !!category;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        {open && (
          <DialogContent
            key={category?.id ?? 'new'}
            category={category}
            title={isEditing ? <Trans message="Edit category" /> : <Trans message="New category" />}
            submitLabel={isEditing ? <Trans message="Save" /> : <Trans message="Create" />}
            onClose={() => setOpen(false)}
          />
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  category,
  title,
  submitLabel,
  onClose,
}: {
  category?: any;
  title: React.ReactNode;
  submitLabel: React.ReactNode;
  onClose: () => void;
}) {
  const form = useForm<BlogCategoryPayload>({
    defaultValues: {
      name: category?.name ?? '',
      slug: category?.slug ?? '',
      description: category?.description ?? '',
      sort_id: category?.sort_id ?? 0,
    },
  });

  const titleValue = useWatch({control: form.control, name: 'name'});

  const createCategory = useMutation(createBlogCategoryOptions());
  const updateCategory = useMutation(
    updateBlogCategoryOptions(category?.id ?? 0),
  );
  const mutation = category ? updateCategory : createCategory;

  const handleSubmit = (values: BlogCategoryPayload) => {
    mutation.mutate(
      {
        ...values,
        slug: values.slug || slugifyString(values.name, '-', true),
      },
      {
        onSuccess: () => {
          toast.success(
            <Trans message={category ? 'Category updated' : 'Category created'} />,
          );
          onClose();
        },
        onError: err => onFormQueryError(err, form),
      },
    );
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content className="sm:max-w-md">
        <Dialog.Header>
          <Dialog.Title>{title}</Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <HookForm.Field name="name">
              <Field.Label>
                <Trans message="Name" />
              </Field.Label>
              <Input required autoFocus />
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field name="slug">
              <Field.Label>
                <Trans message="Slug" />
              </Field.Label>
              <Input placeholder={slugifyString(titleValue ?? '', '-', true)} />
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field name="description">
              <Field.Label>
                <Trans message="Description" />
              </Field.Label>
              <Textarea rows={3} />
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field name="sort_id">
              <Field.Label>
                <Trans message="Sort order" />
              </Field.Label>
              <Input type="number" min="0" />
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

export {BlogCategoryFormDialog};
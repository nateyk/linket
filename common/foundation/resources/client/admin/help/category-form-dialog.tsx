import {
  createHelpCategoryOptions,
  updateHelpCategoryOptions,
} from '@common/admin/help/help-admin-queries';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {HelpCategory} from '@common/help/help-queries';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {slugifyString} from '@ui/utils/string/slugify-string';
import {ReactElement, useState} from 'react';
import {useForm, useWatch} from 'react-hook-form';

interface Payload {
  name: string;
  slug?: string;
}

interface Props {
  children: ReactElement<typeof Dialog.Trigger>;
  category?: HelpCategory;
}

export function CategoryFormDialog({children, category}: Props) {
  const [open, setOpen] = useState(false);
  const isEditing = !!category;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent
          key={category?.id ?? 'new'}
          category={category}
          title={isEditing ? 'Edit category' : 'New category'}
          submitLabel={isEditing ? 'Save' : 'Create'}
          onClose={() => setOpen(false)}
        />
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
  category?: HelpCategory;
  title: string;
  submitLabel: string;
  onClose: () => void;
}) {
  const form = useForm<Payload>({
    defaultValues: {
      name: category?.name ?? '',
      slug: category?.slug ?? '',
    },
  });
  const nameValue = useWatch({control: form.control, name: 'name'});

  const createCategory = useMutation(createHelpCategoryOptions());
  const updateCategory = useMutation(
    updateHelpCategoryOptions(category?.id ?? 0),
  );
  const mutation = category ? updateCategory : createCategory;

  const handleSubmit = (values: Payload) => {
    const payload = {
      name: values.name,
      slug: values.slug || slugifyString(values.name, '-', true),
    };
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success(
          <Trans
            message={category ? 'Category updated' : 'Category created'}
          />,
        );
        onClose();
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message={title} />
          </Dialog.Title>
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
              <Input
                placeholder={slugifyString(nameValue ?? '', '-', true)}
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

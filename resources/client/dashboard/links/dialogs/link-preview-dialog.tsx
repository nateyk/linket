import {getMetadataFromUrl} from '@app/gen/links';
import {UploadType} from '@app/site-config';
import {ImageSelector} from '@common/uploads/components/image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Trans} from '@ui/i18n/trans';
import {ReactNode, useState} from 'react';
import {useForm, useWatch} from 'react-hook-form';

type FormValue = Awaited<ReturnType<typeof getMetadataFromUrl>>;

type Props = {
  values: FormValue;
  onSubmit: (values: FormValue) => void;
  children: ReactNode;
};
export function LinkPreviewDialog({children, onSubmit, values}: Props) {
  const [open, setOpen] = useState(false);

  const handleSubmit = (values: FormValue) => {
    onSubmit(values);
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent values={values} onSubmit={handleSubmit} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({values, onSubmit}: Pick<Props, 'values' | 'onSubmit'>) {
  const form = useForm<FormValue>({
    defaultValues: values,
  });
  const imageValue = useWatch({control: form.control, name: 'image'}) ?? '';

  return (
    <HookForm.Root form={form} onSubmit={onSubmit}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Link preview" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body className="flex flex-col gap-6">
          <FileUploadProvider>
            <Field.Root name="image">
              <Field.Label>
                <Trans message="Image" />
              </Field.Label>
              <ImageSelector.Input
                uploadType={UploadType.linkImages}
                value={imageValue}
                onChange={value => {
                  form.setValue('image', value, {
                    shouldDirty: true,
                  });
                }}
              />
              <Field.Error />
            </Field.Root>

            <HookForm.Field name="name">
              <Field.Label>
                <Trans message="Title" />
              </Field.Label>
              <Textarea maxLength={100} rows={1} />
              <Field.Error />
            </HookForm.Field>

            <HookForm.Field name="description">
              <Field.Label>
                <Trans message="Description" />
              </Field.Label>
              <Textarea rows={3} maxLength={190} />
              <Field.Error />
            </HookForm.Field>
          </FileUploadProvider>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit">
            <Trans message="Save changes" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

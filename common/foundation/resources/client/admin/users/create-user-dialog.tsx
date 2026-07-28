import {CreateUserBody} from '@app/gen/schemas/create-user-body';
import {UploadType} from '@app/site-config';
import {createUserOptions} from '@common/admin/users/users-queries';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {ImageSelector} from '@common/uploads/components/image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ReactElement, useState} from 'react';
import {useForm, useWatch} from 'react-hook-form';

type CreateUserDialogProps = {
  children: ReactElement<typeof Dialog.Trigger>;
};

export function CreateUserDialog({children}: CreateUserDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent onClose={() => setOpen(false)} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({onClose}: {onClose: () => void}) {
  const form = useForm<CreateUserBody>();
  const imageValue = useWatch({control: form.control, name: 'image'}) ?? '';

  const createUser = useMutation(createUserOptions());
  const navigate = useNavigate();

  const handleSubmit = (values: CreateUserBody) => {
    createUser.mutate(values, {
      onSuccess: user => {
        toast.success(<Trans message="User created" />);
        onClose();
        navigate(`${user.data.id}`, {replace: true});
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Create user" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <FileUploadProvider>
              <Field.Root name="image">
                <Field.Label>
                  <Trans message="Avatar" />
                </Field.Label>
                <ImageSelector.Input
                  uploadType={UploadType.brandingImages}
                  value={imageValue}
                  onChange={value => {
                    form.setValue('image', value, {
                      shouldDirty: true,
                    });
                  }}
                />
                <Field.Error />
              </Field.Root>
            </FileUploadProvider>
            <HookForm.Field name="email">
              <Field.Label>
                <Trans message="Email" />
              </Field.Label>
              <Input required type="email" />
              <Field.Error />
            </HookForm.Field>
            <HookForm.Field name="name">
              <Field.Label>
                <Trans message="Name" />
              </Field.Label>
              <Input />
              <Field.Error />
            </HookForm.Field>
            <HookForm.Field name="password">
              <Field.Label>
                <Trans message="Password" />
              </Field.Label>
              <Input required type="password" />
              <Field.Error />
            </HookForm.Field>
          </Field.Group>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={createUser.isPending}>
            <Trans message="Create" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

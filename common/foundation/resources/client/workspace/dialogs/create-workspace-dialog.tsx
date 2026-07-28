import {CreateWorkspaceBody} from '@app/gen/schemas/create-workspace-body';
import {Workspace} from '@app/gen/schemas/workspace';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {ImageSelector} from '@common/uploads/components/image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {createWorkspaceOptions} from '@common/workspace/workspace-queries';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ReactElement} from 'react';
import {useForm, useWatch} from 'react-hook-form';

type Props = {
  children: ReactElement<typeof Dialog.Trigger>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate?: (workspace: Workspace) => void;
};

export function CreateWorkspaceDialog({
  children,
  open,
  onOpenChange,
  onCreate,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent
          onCreate={workspace => {
            onCreate?.(workspace);
            onOpenChange(false);
          }}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  onCreate,
}: {
  onCreate?: (workspace: Workspace) => void;
}) {
  const form = useForm<CreateWorkspaceBody>({
    defaultValues: {name: '', image: ''},
  });
  const imageValue = useWatch({control: form.control, name: 'image'}) ?? '';
  const createWorkspace = useMutation(createWorkspaceOptions());

  const handleSubmit = (values: CreateWorkspaceBody) => {
    createWorkspace.mutate(values, {
      onSuccess: response => {
        toast.success(<Trans message="Workspace created" />);
        const newWorkspace = response.data.find(
          workspace => workspace.name === values.name,
        );
        if (newWorkspace) {
          onCreate?.(newWorkspace);
        }
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Create workspace" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <FileUploadProvider>
              <Field.Root name="image">
                <Field.Label>
                  <Trans message="Logo" />
                </Field.Label>
                <ImageSelector.Input
                  uploadType="avatars"
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
            <HookForm.Field name="name">
              <Field.Label>
                <Trans message="Name" />
              </Field.Label>
              <Input autoFocus required minLength={3} />
              <Field.Error />
            </HookForm.Field>
          </Field.Group>
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={createWorkspace.isPending}>
            <Trans message="Create" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

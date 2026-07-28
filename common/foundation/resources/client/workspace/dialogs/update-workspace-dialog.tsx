import {UpdateWorkspaceBody} from '@app/gen/schemas/update-workspace-body';
import {Workspace} from '@app/gen/schemas/workspace';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {ImageSelector} from '@common/uploads/components/image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {updateWorkspaceOptions} from '@common/workspace/workspace-queries';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ComponentProps, ReactElement} from 'react';
import {useForm, useWatch} from 'react-hook-form';

type Props = {
  workspace: Workspace;
  children?: ReactElement<ComponentProps<typeof Dialog.Trigger>>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (workspace: Workspace) => void;
};

export function UpdateWorkspaceDialog({
  workspace,
  children,
  open,
  onOpenChange,
  onUpdate,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent
          workspace={workspace}
          onUpdate={updatedWorkspace => {
            onUpdate?.(updatedWorkspace);
            onOpenChange(false);
          }}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  workspace,
  onUpdate,
}: {
  workspace: Workspace;
  onUpdate?: (workspace: Workspace) => void;
}) {
  const form = useForm<UpdateWorkspaceBody>({
    defaultValues: {
      name: workspace.name,
      image: workspace.image ?? '',
    },
  });
  const imageValue = useWatch({control: form.control, name: 'image'}) ?? '';

  const updateWorkspace = useMutation(updateWorkspaceOptions(workspace.id));

  const handleSubmit = (values: UpdateWorkspaceBody) => {
    updateWorkspace.mutate(values, {
      onSuccess: response => {
        toast.success(<Trans message="Workspace updated" />);
        onUpdate?.(response.data);
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Update workspace" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Field.Group>
            <FileUploadProvider>
              <Field.Root name="image">
                <Field.Label>
                  <Trans message="Image" />
                </Field.Label>
                <ImageSelector.Input
                  value={imageValue}
                  onChange={value =>
                    form.setValue('image', value, {shouldDirty: true})
                  }
                  uploadType="avatars"
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
          <Button type="submit" disabled={updateWorkspace.isPending}>
            <Trans message="Save" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

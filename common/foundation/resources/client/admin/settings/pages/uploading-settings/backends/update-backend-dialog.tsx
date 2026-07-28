import {BackendDialogFields} from '@common/admin/settings/pages/uploading-settings/backends/backend-dialog-fields';
import {BackendFormValue} from '@common/admin/settings/pages/uploading-settings/backends/backends';
import {validateUploadBackendCredentialsOptions} from '@common/admin/settings/settings-queries';
import {UploadingBackendSettings} from '@common/core/settings/base-backend-settings';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {TriangleAlertIcon} from 'lucide-react';
import {useForm} from 'react-hook-form';

type Props = {
  backend: UploadingBackendSettings;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (backend: UploadingBackendSettings) => void;
};

export function UpdateBackendDialog({
  backend,
  open,
  onOpenChange,
  onUpdated,
}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent
          backend={backend}
          onUpdated={onUpdated}
          onOpenChange={onOpenChange}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  backend,
  onUpdated,
  onOpenChange,
}: Pick<Props, 'backend' | 'onUpdated' | 'onOpenChange'>) {
  const form = useForm<BackendFormValue>({
    defaultValues: {
      type: backend.type,
      name: backend.name,
      root: backend.root,
      domain: backend.domain,
      config: backend.config
        ? {
            [backend.type]: backend.config,
          }
        : undefined,
    },
  });

  const validateBackend = useMutation({
    ...validateUploadBackendCredentialsOptions(),
    onError: err => onFormQueryError(err, form),
  });

  const handleSubmit = (value: BackendFormValue) => {
    const payload: UploadingBackendSettings = {
      ...value,
      id: backend.id,
      config: value.config?.[value.type],
    };
    validateBackend.mutate(payload, {
      onSuccess: () => {
        onUpdated(payload);
        onOpenChange(false);
      },
    });
  };

  return (
    <HookForm.Root className="contents" form={form} onSubmit={handleSubmit}>
      <Dialog.Content className="sm:max-w-lg">
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Update backend" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <Alert.Root
            variant="destructive"
            fillStyle="subtleFill"
            className="mb-6"
          >
            <TriangleAlertIcon />
            <Alert.Description>
              <Trans message="Changing type, path, host or bucket settings will make files previosuly uploaded to this backend unavailable. Consider creating a new backend instead." />
            </Alert.Description>
          </Alert.Root>
          <BackendDialogFields />
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button
            color="primary"
            type="submit"
            disabled={validateBackend.isPending}
          >
            <Trans message="Update" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

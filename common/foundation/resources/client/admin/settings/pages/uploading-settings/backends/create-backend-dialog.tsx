import {BackendDialogFields} from '@common/admin/settings/pages/uploading-settings/backends/backend-dialog-fields';
import {BackendFormValue} from '@common/admin/settings/pages/uploading-settings/backends/backends';
import {validateUploadBackendCredentialsOptions} from '@common/admin/settings/settings-queries';
import {UploadingBackendSettings} from '@common/core/settings/base-backend-settings';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {nanoid} from 'nanoid';
import {useForm} from 'react-hook-form';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (backend: UploadingBackendSettings) => void;
};

export function CreateBackendDialog({open, onOpenChange, onCreated}: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent onCreated={onCreated} onOpenChange={onOpenChange} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  onCreated,
  onOpenChange,
}: Pick<Props, 'onCreated' | 'onOpenChange'>) {
  const form = useForm<BackendFormValue>({
    defaultValues: {
      type: 'local',
      root: '',
      name: '',
      config: {},
    },
  });

  const validateBackend = useMutation({
    ...validateUploadBackendCredentialsOptions(),
    onError: err => onFormQueryError(err, form),
  });

  const handleSubmit = (value: BackendFormValue) => {
    const payload = {
      id: nanoid(10),
      ...value,
      config: value.config[value.type],
    };
    validateBackend.mutate(payload, {
      onSuccess: () => {
        onCreated(payload);
        onOpenChange(false);
      },
    });
  };

  return (
    <HookForm.Root className="contents" form={form} onSubmit={handleSubmit}>
      <Dialog.Content className="sm:max-w-lg">
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Create backend" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
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
            <Trans message="Create" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

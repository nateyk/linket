import {createFolderOptions} from '@app/dashboard/folders/folders-queries';
import {LinkeableQRCodePanel} from '@app/dashboard/links/forms/linkeable-qr-code-panel';
import {useUsage} from '@app/dashboard/use-usage';
import {CrupdateFolderBody} from '@app/gen/schemas/crupdate-folder-body';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {useMutation} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {useSettings} from '@ui/settings/use-settings';
import {toast} from '@ui/toast/toast';
import {CornerDownLeftIcon} from 'lucide-react';
import {nanoid} from 'nanoid';
import {ReactElement, useState} from 'react';
import {useForm} from 'react-hook-form';
import {FolderFields} from './folder-fields';

type Props = {
  children: ReactElement<typeof Dialog.Trigger>;
};

export function CreateFolderDialog({children}: Props) {
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
  const {trans} = useTrans();
  const {custom_domains} = useSettings();
  const usageQuery = useUsage();
  const canCreateQrCode = usageQuery.data?.data.qr_codes.create.allowed;
  const form = useForm<CrupdateFolderBody>({
    defaultValues: {
      back_half: nanoid(6),
      rotator: false,
      domain_id: custom_domains?.allow_all_option ? undefined : 0,
      create_qr_code: canCreateQrCode,
    },
  });

  const createFolder = useMutation(createFolderOptions());

  const handleSubmit = (values: CrupdateFolderBody) => {
    createFolder.mutate(values, {
      onSuccess: () => {
        toast.positive(trans(message('Folder created')));
        onClose();
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content className="sm:max-w-5xl">
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Create folder" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body className="flex flex-col items-start gap-8.5 md:flex-row">
          <FolderFields className="flex-1" />
          <section className="w-full shrink-0 lg:w-80">
            <LinkeableQRCodePanel variant="outline" previewSize={120} />
          </section>
        </Dialog.Body>
        <Dialog.Footer>
          <Button variant="outline" onClick={onClose}>
            <Trans message="Cancel" />
          </Button>
          <Button
            variant="default"
            color="primary"
            type="submit"
            disabled={createFolder.isPending}
          >
            <Trans message="Create folder" />
            <CornerDownLeftIcon data-icon="inline-end" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

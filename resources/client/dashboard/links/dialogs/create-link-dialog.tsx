import {DestinationUrlField} from '@app/dashboard/links/forms/destination-url-field';
import {LinkFolderField} from '@app/dashboard/links/forms/link-folder-field';
import {LinkFormActionButtons} from '@app/dashboard/links/forms/link-form-action-buttons';
import {LinkPreviewPanel} from '@app/dashboard/links/forms/link-preview-panel';
import {LinkTypeField} from '@app/dashboard/links/forms/link-type-field';
import {LinkeableQRCodePanel} from '@app/dashboard/links/forms/linkeable-qr-code-panel';
import {LinkeableTagsField} from '@app/dashboard/links/forms/linkeable-tags-field';
import {ShortUrlField} from '@app/dashboard/links/forms/short-url-field';
import {createLinkOptions} from '@app/dashboard/links/links-queries';
import {urlIsValid} from '@app/dashboard/links/utils/url-is-valid';
import {useLinkDefaultFormValues} from '@app/dashboard/links/utils/use-linkeable-default-form-values';
import {useUsage} from '@app/dashboard/use-usage';
import {CrupdateLinkBody} from '@app/gen/schemas/crupdate-link-body';
import {Folder} from '@app/gen/schemas/folder';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {useIsMobile} from '@shadcn/hooks/use-mobile';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {CornerDownLeftIcon, LinkIcon} from 'lucide-react';
import {ReactElement, useState} from 'react';
import {useForm} from 'react-hook-form';

type CreateLinkDialogProps = {
  children: ReactElement<typeof Dialog.Trigger>;
  folder?: Folder | null;
};
export function CreateLinkDialog({children, folder}: CreateLinkDialogProps) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent folder={folder} onClose={() => setOpen(false)} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  folder,
  onClose,
}: Pick<CreateLinkDialogProps, 'folder'> & {onClose: () => void}) {
  const usageQuery = useUsage();
  const canCreateQrCode = usageQuery.data?.data.qr_codes.create.allowed;
  const {trans} = useTrans();
  const form = useForm<CrupdateLinkBody>({
    defaultValues: {
      ...useLinkDefaultFormValues({folder}),
      create_qr_code: canCreateQrCode,
    },
  });
  const createLink = useMutation(createLinkOptions());

  const handleSubmit = (values: CrupdateLinkBody) => {
    if (!urlIsValid(values.long_url)) {
      form.setError('long_url', {
        message: trans(message('This url is invalid.')),
      });
      return;
    }

    createLink.mutate(values, {
      onSuccess: () => {
        toast.success(<Trans message="Link created" />);
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
            <LinkIcon />
            <Trans message="New link" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body className="flex flex-col items-start gap-8.5 md:flex-row">
          <Field.Group className="pt-4">
            <DestinationUrlField autoFocus />
            <ShortUrlField backHalfName="back_half" domainName="domain_id" />
            <LinkTypeField />
            <LinkFolderField />
            <LinkeableTagsField />
          </Field.Group>
          <Sidebar />
        </Dialog.Body>
        <Dialog.Footer variant="muted" className="py-4 sm:justify-between">
          <LinkFormActionButtons form={form} className="mt-4 md:mt-0" />
          <Button
            size="sm"
            variant="default"
            color="primary"
            type="submit"
            disabled={createLink.isPending}
          >
            <Trans message="Create link" />
            <CornerDownLeftIcon data-icon="inline-end" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

function Sidebar() {
  const isMobile = useIsMobile();
  return (
    <div className="relative isolate flex w-full shrink-0 flex-col gap-6 lg:w-80">
      <LinkeableQRCodePanel variant="outline" />
      <LinkPreviewPanel variant="outline" compact={!isMobile} />
    </div>
  );
}

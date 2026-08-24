import {useBiolinkEditorStore} from '@app/dashboard/stores/store-editor/biolink-editor-store';
import {updateStoreLinkOptions} from '@app/dashboard/stores/stores-queries';
import {BiolinkLink} from '@app/gen/schemas/biolink-link';
import {CrupdateBiolinkLinkBody} from '@app/gen/schemas/crupdate-biolink-link-body';
import {UploadType} from '@app/site-config';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {ImageSelector} from '@common/uploads/components/image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ReactNode} from 'react';
import {useForm, useWatch} from 'react-hook-form';

type Props = {
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  link: BiolinkLink;
};

export function LinkThumbnailDialog({
  children,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  link,
}: Props) {
  const [open, setOpen] = useControlledState(openProp, false, onOpenChangeProp);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent link={link} onClose={() => setOpen(false)} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  link,
  onClose,
}: {
  link: BiolinkLink;
  onClose: () => void;
}) {
  const biolink = useBiolinkEditorStore(s => s.biolink);
  const overrideContent = useBiolinkEditorStore(s => s.overrideContent);
  const form = useForm<CrupdateBiolinkLinkBody>({
    defaultValues: {
      image: link.image,
    },
  });
  const imageValue = useWatch({control: form.control, name: 'image'}) ?? '';
  const updateLink = useMutation(updateStoreLinkOptions(biolink.id, link.id));

  const handleSubmit = (values: CrupdateBiolinkLinkBody) => {
    updateLink.mutate(values, {
      onSuccess: response => {
        overrideContent(response.data.content);
        toast.success(<Trans message="Thumbnail updated" />);
        onClose();
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <FileUploadProvider>
      <HookForm.Root form={form} onSubmit={handleSubmit}>
        <Dialog.Content className="sm:max-w-lg">
          <Dialog.Header>
            <Dialog.Title>
              <Trans message="Link thumbnail" />
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <ImageSelector.Square
              className="w-full"
              placeholderVariant="dropzone"
              uploadType={UploadType.linkImages}
              value={imageValue}
              onChange={value => {
                form.setValue('image', value, {
                  shouldDirty: true,
                });
              }}
            />
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.CloseButton>
              <Trans message="Cancel" />
            </Dialog.CloseButton>
            <Button
              type="submit"
              disabled={updateLink.isPending || !form.formState.isDirty}
            >
              <Trans message="Save" />
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </HookForm.Root>
    </FileUploadProvider>
  );
}

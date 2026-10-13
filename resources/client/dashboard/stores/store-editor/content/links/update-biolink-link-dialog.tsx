import {useBiolinkEditorStore} from '@app/dashboard/stores/store-editor/biolink-editor-store';
import {updateStoreLinkOptions} from '@app/dashboard/stores/stores-queries';
import {DestinationUrlField} from '@app/dashboard/links/forms/destination-url-field';
import {LinkFormActionButtons} from '@app/dashboard/links/forms/link-form-action-buttons';
import {LinkTypeField} from '@app/dashboard/links/forms/link-type-field';
import {ShortUrlField} from '@app/dashboard/links/forms/short-url-field';
import {urlIsValid} from '@app/dashboard/links/utils/url-is-valid';
import {useLinkDefaultFormValues} from '@app/dashboard/links/utils/use-linkeable-default-form-values';
import {BiolinkLink} from '@app/gen/schemas/biolink-link';
import {CrupdateBiolinkLinkBody} from '@app/gen/schemas/crupdate-biolink-link-body';
import {CrupdateLinkBody} from '@app/gen/schemas/crupdate-link-body';
import {UploadType} from '@app/site-config';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {ImageSelector} from '@common/uploads/components/image-selector';
import {FileUploadProvider} from '@common/uploads/uploader/file-upload-provider';
import {useControlledState} from '@react-stately/utils';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {CornerDownLeftIcon, LinkIcon} from 'lucide-react';
import {ReactElement} from 'react';
import {useForm, useWatch} from 'react-hook-form';

type Props = {
  children?: ReactElement<typeof Dialog.Trigger>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  position?: number;
  link: BiolinkLink;
};

export function UpdateBiolinkLinkDialog({
  children,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  position,
  link,
}: Props) {
  const [open, setOpen] = useControlledState(openProp, false, onOpenChangeProp);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent
          onClose={() => setOpen(false)}
          position={position}
          link={link}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  onClose,
  position,
  link,
}: {
  onClose: () => void;
  position?: number;
  link: BiolinkLink;
}) {
  const biolink = useBiolinkEditorStore(s => s.biolink);
  const {trans} = useTrans();
  const overrideContent = useBiolinkEditorStore(s => s.overrideContent);
  const form = useForm<CrupdateBiolinkLinkBody>({
    defaultValues: {
      ...useLinkDefaultFormValues({link}),
      position,
    },
  });
  const imageValue = useWatch({control: form.control, name: 'image'}) ?? '';

  const updateLink = useMutation(updateStoreLinkOptions(String(biolink.id), String(link.id)));

  const handleSubmit = (values: CrupdateLinkBody) => {
    if (!urlIsValid(values.long_url)) {
      form.setError('long_url', {
        message: trans(message('This url is invalid.')),
      });
      return;
    }

    updateLink.mutate(values, {
      onSuccess: response => {
        overrideContent(response.data.content);
        toast.success(<Trans message="Link updated" />);
        onClose();
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <FileUploadProvider>
      <HookForm.Root form={form} onSubmit={handleSubmit}>
        <Dialog.Content className="sm:max-w-5xl">
          <Dialog.Header>
            <Dialog.Title>
              <LinkIcon />
              <Trans message="Update link" />
            </Dialog.Title>
          </Dialog.Header>
          <Dialog.Body>
            <Field.Group>
              <div className="flex items-end gap-6">
                <ImageSelector.Square
                  className="shrink-0"
                  placeholderVariant="icon"
                  uploadType={UploadType.linkImages}
                  value={imageValue}
                  onChange={value => {
                    form.setValue('image', value, {
                      shouldDirty: true,
                    });
                  }}
                />
                <Field.Group className="flex-1">
                  <HookForm.Field name="name">
                    <Field.Label>
                      <Trans message="Title" />
                    </Field.Label>
                    <Input required autoFocus />
                    <Field.Error />
                  </HookForm.Field>
                  <HookForm.Field name="description">
                    <Field.Label>
                      <Trans message="Description" />
                    </Field.Label>
                    <Input autoFocus placeholder={trans(message('Optional'))} />
                    <Field.Error />
                  </HookForm.Field>
                </Field.Group>
              </div>
              <DestinationUrlField autoFocus />
              <ShortUrlField backHalfName="back_half" domainName="domain_id" />
              <LinkTypeField />
            </Field.Group>
          </Dialog.Body>
          <Dialog.Footer className="py-4 sm:justify-between">
            <LinkFormActionButtons form={form} />
            <Button
              size="sm"
              variant="default"
              color="primary"
              type="submit"
              disabled={updateLink.isPending}
            >
              <Trans message="Update link" />
              <CornerDownLeftIcon data-icon="inline-end" />
            </Button>
          </Dialog.Footer>
        </Dialog.Content>
      </HookForm.Root>
    </FileUploadProvider>
  );
}

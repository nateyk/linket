import {CrupdatePixelForm} from '@app/dashboard/tracking-pixels/crupdate-dialog/crupdate-pixel-form';
import {updateTrackingPixelOptions} from '@app/dashboard/tracking-pixels/tracking-pixels-queries';
import {CrupdateTrackingPixelBody} from '@app/gen/schemas/crupdate-tracking-pixel-body';
import {TrackingPixel} from '@app/gen/schemas/tracking-pixel';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {useMutation} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {toast} from '@ui/toast/toast';
import {useForm} from 'react-hook-form';

type UpdatePixelDialogProps = {
  pixel: TrackingPixel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UpdatePixelDialog({
  pixel,
  open,
  onOpenChange,
}: UpdatePixelDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent pixel={pixel} onClose={() => onOpenChange(false)} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  pixel,
  onClose,
}: {
  pixel: TrackingPixel;
  onClose: () => void;
}) {
  const {trans} = useTrans();
  const form = useForm<CrupdateTrackingPixelBody>({
    defaultValues: {
      name: pixel.name,
      type: pixel.type,
      pixel_id: pixel.pixel_id ?? undefined,
      head_code: pixel.head_code ?? undefined,
      body_code: pixel.body_code ?? undefined,
    },
  });
  const updatePixel = useMutation(updateTrackingPixelOptions(pixel.id));

  const handleSubmit = (values: CrupdateTrackingPixelBody) => {
    updatePixel.mutate(values, {
      onSuccess: () => {
        toast.positive(trans(message('Pixel updated')));
        onClose();
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content>
        <Dialog.Header>
          <Dialog.Title>
            <Trans message="Update “:name“" values={{name: pixel.name}} />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <CrupdatePixelForm />
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={updatePixel.isPending}>
            <Trans message="Update" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

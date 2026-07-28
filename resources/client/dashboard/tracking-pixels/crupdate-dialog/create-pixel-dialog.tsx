import {CrupdatePixelForm} from '@app/dashboard/tracking-pixels/crupdate-dialog/crupdate-pixel-form';
import {createTrackingPixelOptions} from '@app/dashboard/tracking-pixels/tracking-pixels-queries';
import {CrupdateTrackingPixelBody} from '@app/gen/schemas/crupdate-tracking-pixel-body';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {useMutation} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {toast} from '@ui/toast/toast';
import {ReactElement, useState} from 'react';
import {useForm} from 'react-hook-form';

type CreatePixelDialogProps = {
  children: ReactElement<typeof Dialog.Trigger>;
};

export function CreatePixelDialog({children}: CreatePixelDialogProps) {
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
  const form = useForm<CrupdateTrackingPixelBody>({
    defaultValues: {type: 'facebook', name: '', pixel_id: ''},
  });
  const createPixel = useMutation(createTrackingPixelOptions());

  const handleSubmit = (values: CrupdateTrackingPixelBody) => {
    createPixel.mutate(values, {
      onSuccess: () => {
        toast.positive(trans(message('Pixel created')));
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
            <Trans message="Create pixel" />
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <CrupdatePixelForm />
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={createPixel.isPending}>
            <Trans message="Create" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

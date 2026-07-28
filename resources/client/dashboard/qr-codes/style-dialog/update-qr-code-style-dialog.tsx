import {updateQrCodeOptions} from '@app/dashboard/qr-codes/qr-codes-queries';
import {
  getQrCodeStyleFormDefaultValues,
  QrCodeStyleFormContent,
} from '@app/dashboard/qr-codes/style-dialog/qr-code-style-form-content';
import {useQrCodeFeatureStatus} from '@app/dashboard/upgrade/use-feature-status';
import {CrupdateQrCodeBody} from '@app/gen/schemas/crupdate-qr-code-body';
import {QrCode} from '@app/gen/schemas/qr-code';
import {NoFeaturePermissionPopover} from '@common/billing/upgrade/no-permission-button';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {PaintbrushIcon} from 'lucide-react';
import {useForm} from 'react-hook-form';

export type UpdateQrCodeStyleDialogProps = {
  id: number;
  url: string;
  style?: QrCode['style'];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function UpdateQrCodeStyleDialog({
  id,
  url,
  style,
  open,
  onOpenChange,
}: UpdateQrCodeStyleDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent
          id={id}
          url={url}
          style={style}
          onClose={() => onOpenChange(false)}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  id,
  url,
  style,
  onClose,
}: Pick<UpdateQrCodeStyleDialogProps, 'id' | 'url' | 'style'> & {
  onClose: () => void;
}) {
  const {disabled: styleDisabled} = useQrCodeFeatureStatus('style');
  const updateQrCode = useMutation(updateQrCodeOptions(id));
  const form = useForm<Required<CrupdateQrCodeBody>['style']>({
    defaultValues: getQrCodeStyleFormDefaultValues(style),
  });

  const handleSubmit = (values: Required<CrupdateQrCodeBody>['style']) => {
    updateQrCode.mutate(
      {style: values},
      {
        onSuccess: () => {
          onClose();
          toast.success(<Trans message="QR code updated" />);
        },
        onError: err => onFormQueryError(err, form),
      },
    );
  };

  return (
    <HookForm.Root form={form} onSubmit={handleSubmit}>
      <Dialog.Content className="sm:max-w-lg">
        <Dialog.Header>
          <Dialog.Title>
            <PaintbrushIcon />
            <Trans message="QR code" />
            {styleDisabled && (
              <NoFeaturePermissionPopover.Root
                message={
                  <Trans message="Your current plan doesn't include QR code style customization." />
                }
              >
                <NoFeaturePermissionPopover.ButtonTrigger />
              </NoFeaturePermissionPopover.Root>
            )}
          </Dialog.Title>
        </Dialog.Header>
        <Dialog.Body>
          <QrCodeStyleFormContent url={url} />
        </Dialog.Body>
        <Dialog.Footer>
          <Dialog.CloseButton disabled={updateQrCode.isPending}>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button
            type="submit"
            disabled={updateQrCode.isPending || styleDisabled}
          >
            <Trans message="Save changes" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

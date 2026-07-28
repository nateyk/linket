import {
  getQrCodeStyleFormDefaultValues,
  QrCodeStyleFormContent,
} from '@app/dashboard/qr-codes/style-dialog/qr-code-style-form-content';
import {useQrCodeFeatureStatus} from '@app/dashboard/upgrade/use-feature-status';
import {CrupdateQrCodeBody} from '@app/gen/schemas/crupdate-qr-code-body';
import {QrCode} from '@app/gen/schemas/qr-code';
import {NoFeaturePermissionPopover} from '@common/billing/upgrade/no-permission-button';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Trans} from '@ui/i18n/trans';
import {PaintbrushIcon} from 'lucide-react';
import {ReactNode, useState} from 'react';
import {useForm} from 'react-hook-form';

export type SelectQrCodeStyleDialogProps = {
  url: string;
  style?: QrCode['style'];
  onSubmit: (style: Required<CrupdateQrCodeBody>['style']) => void;
  children: ReactNode;
};
export function SelectQrCodeStyleDialog({
  url,
  style,
  onSubmit,
  children,
}: SelectQrCodeStyleDialogProps) {
  const [open, setOpen] = useState(false);

  const handleSubmit = (values: Required<CrupdateQrCodeBody>['style']) => {
    onSubmit(values);
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent url={url} style={style} onSubmit={handleSubmit} />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DialogContent({
  url,
  style,
  onSubmit,
}: Pick<SelectQrCodeStyleDialogProps, 'url' | 'style'> & {
  onSubmit: (values: Required<CrupdateQrCodeBody>['style']) => void;
}) {
  const {disabled: styleDisabled} = useQrCodeFeatureStatus('style');

  const form = useForm<Required<CrupdateQrCodeBody>['style']>({
    defaultValues: getQrCodeStyleFormDefaultValues(style),
  });

  return (
    <HookForm.Root form={form} onSubmit={onSubmit}>
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
          <Dialog.CloseButton>
            <Trans message="Cancel" />
          </Dialog.CloseButton>
          <Button type="submit" disabled={styleDisabled}>
            <Trans message="Save changes" />
          </Button>
        </Dialog.Footer>
      </Dialog.Content>
    </HookForm.Root>
  );
}

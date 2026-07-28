import {
  archiveQrCodesOptions,
  unarchiveQrCodesOptions,
} from '@app/dashboard/qr-codes/qr-codes-queries';
import {QrCode} from '@app/gen/schemas/qr-code';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ComponentProps, ReactElement} from 'react';

type Props = {
  qrCodes: QrCode[];
  unarchive: boolean;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactElement<ComponentProps<typeof AlertDialog.Trigger>>;
};

export function ArchiveQrCodesDialog({
  open,
  onOpenChange,
  children,
  qrCodes,
  unarchive,
  onSuccess,
}: Props) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <DialogContent
          qrCodes={qrCodes}
          unarchive={unarchive}
          onSuccess={onSuccess}
        />
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function DialogContent({
  qrCodes,
  unarchive,
  onSuccess,
}: Pick<Props, 'qrCodes' | 'unarchive' | 'onSuccess'>) {
  const archiveQrCodes = useMutation(archiveQrCodesOptions());
  const unarchiveQrCodes = useMutation(unarchiveQrCodesOptions());
  const mutation = unarchive ? unarchiveQrCodes : archiveQrCodes;

  const handleConfirm = () => {
    mutation.mutate(
      qrCodes.map(qrCode => qrCode.id),
      {
        onSuccess: () => {
          onSuccess();
          toast.success(
            unarchive ? (
              <Trans
                message="[one QR code unarchived|other :count QR codes unarchived]"
                values={{count: qrCodes.length}}
              />
            ) : (
              <Trans
                message="[one QR code archived|other :count QR codes archived]"
                values={{count: qrCodes.length}}
              />
            ),
          );
        },
        onError: err => showHttpErrorToast(err),
      },
    );
  };

  return (
    <AlertDialog.Content size="sm">
      <AlertDialog.Header>
        <AlertDialog.Title>
          {unarchive ? (
            <Trans
              message="Unarchive [one QR code|other :count QR codes]"
              values={{count: qrCodes.length}}
            />
          ) : (
            <Trans
              message="Archive [one QR code|other :count QR codes]"
              values={{count: qrCodes.length}}
            />
          )}
        </AlertDialog.Title>
        <AlertDialog.Description>
          {unarchive ? (
            <Trans
              message="Are you sure you want to unarchive [one this QR code|other selected QR codes]?"
              values={{count: qrCodes.length}}
            />
          ) : (
            <Trans
              message="Are you sure you want to archive [one this QR code|other selected QR codes]?"
              values={{count: qrCodes.length}}
            />
          )}
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>
          <Trans message="Cancel" />
        </AlertDialog.Cancel>
        <AlertDialog.Action
          disabled={mutation.isPending}
          onClick={() => handleConfirm()}
        >
          {unarchive ? (
            <Trans message="Unarchive" />
          ) : (
            <Trans message="Archive" />
          )}
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
}

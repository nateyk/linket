import {deleteQrCodesOptions} from '@app/dashboard/qr-codes/qr-codes-queries';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {useControlledState} from '@react-stately/utils';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ComponentProps, ReactElement} from 'react';

type DeleteQrCodesDialogProps = {
  qrCodeIds: (number | string)[];
  onDelete?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactElement<ComponentProps<typeof AlertDialog.Trigger>>;
};

export function DeleteQrCodesDialog({
  open: propsOpen,
  onOpenChange: propsOnOpenChange,
  children,
  qrCodeIds,
  onDelete,
}: DeleteQrCodesDialogProps) {
  const [open, onOpenChange] = useControlledState(
    propsOpen,
    false,
    propsOnOpenChange,
  );
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <DialogContent qrCodeIds={qrCodeIds} onDelete={onDelete} />
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function DialogContent({
  qrCodeIds,
  onDelete,
}: Pick<DeleteQrCodesDialogProps, 'qrCodeIds' | 'onDelete'>) {
  const deleteQrCodes = useMutation(deleteQrCodesOptions());

  const handleDelete = () => {
    deleteQrCodes.mutate(qrCodeIds, {
      onSuccess: () => {
        toast.success(
          <Trans
            message="[one QR code|other :count QR codes] deleted"
            values={{count: qrCodeIds.length}}
          />,
        );
        onDelete?.();
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <AlertDialog.Content size="sm">
      <AlertDialog.Header>
        <AlertDialog.Title>
          <Trans
            message="Delete [one QR code|other :count QR codes]"
            values={{count: qrCodeIds.length}}
          />
        </AlertDialog.Title>
        <AlertDialog.Description>
          <Trans
            message="Are you sure you want to delete [one this QR code|other selected QR codes]?"
            values={{count: qrCodeIds.length}}
          />
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>
          <Trans message="Cancel" />
        </AlertDialog.Cancel>
        <AlertDialog.Action
          color="danger"
          disabled={deleteQrCodes.isPending}
          onClick={() => handleDelete()}
        >
          <Trans message="Delete" />
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
}

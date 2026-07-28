import {deleteTrackingPixelsOptions} from '@app/dashboard/tracking-pixels/tracking-pixels-queries';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {useMutation} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {toast} from '@ui/toast/toast';
import {ComponentProps, ReactElement} from 'react';

type DeleteTrackingPixelsDialogProps = {
  ids: Array<number | string>;
  onDelete?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactElement<ComponentProps<typeof AlertDialog.Trigger>>;
};

export function DeleteTrackingPixelsDialog({
  open,
  onOpenChange,
  children,
  ids,
  onDelete,
}: DeleteTrackingPixelsDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <DialogContent ids={ids} onDelete={onDelete} />
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function DialogContent({
  ids,
  onDelete,
}: Pick<DeleteTrackingPixelsDialogProps, 'ids' | 'onDelete'>) {
  const deleteTrackingPixels = useMutation(deleteTrackingPixelsOptions());

  const handleDelete = () => {
    deleteTrackingPixels.mutate(ids, {
      onSuccess: () => {
        onDelete?.();
        toast(
          message('[one Tracking pixel|other :count tracking pixels] deleted', {
            values: {count: ids.length},
          }),
        );
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <AlertDialog.Content size="sm">
      <AlertDialog.Header>
        <AlertDialog.Title>
          <Trans
            message="Delete [one tracking pixel|other :count tracking pixels]"
            values={{count: ids.length}}
          />
        </AlertDialog.Title>
        <AlertDialog.Description>
          <Trans
            message="Are you sure you want to delete [one this tracking pixel|other selected tracking pixels]?"
            values={{count: ids.length}}
          />
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>
          <Trans message="Cancel" />
        </AlertDialog.Cancel>
        <AlertDialog.Action
          color="danger"
          disabled={deleteTrackingPixels.isPending}
          onClick={() => handleDelete()}
        >
          <Trans message="Delete" />
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
}

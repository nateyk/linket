import {deleteLinkOverlaysOptions} from '@app/dashboard/link-overlays/link-overlays-queries';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {useMutation} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {toast} from '@ui/toast/toast';
import {ComponentProps, ReactElement} from 'react';

type DeleteLinkOverlaysDialogProps = {
  ids: Array<number | string>;
  onDelete?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactElement<ComponentProps<typeof AlertDialog.Trigger>>;
};

export function DeleteLinkOverlaysDialog({
  open,
  onOpenChange,
  children,
  ids,
  onDelete,
}: DeleteLinkOverlaysDialogProps) {
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
}: Pick<DeleteLinkOverlaysDialogProps, 'ids' | 'onDelete'>) {
  const deleteLinkOverlays = useMutation(deleteLinkOverlaysOptions());

  const handleDelete = () => {
    deleteLinkOverlays.mutate(ids, {
      onSuccess: () => {
        onDelete?.();
        toast(
          message('[one Link overlay|other :count link overlays] deleted', {
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
            message="Delete [one link overlay|other :count link overlays]"
            values={{count: ids.length}}
          />
        </AlertDialog.Title>
        <AlertDialog.Description>
          <Trans
            message="Are you sure you want to delete [one this link overlay|other selected link overlays]?"
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
          disabled={deleteLinkOverlays.isPending}
          onClick={() => handleDelete()}
        >
          <Trans message="Delete" />
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
}

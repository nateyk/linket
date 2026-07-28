import {deleteLinkPagesOptions} from '@app/dashboard/link-pages/link-pages-queries';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {useMutation} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {toast} from '@ui/toast/toast';
import {ComponentProps, ReactElement} from 'react';

type DeleteLinkPagesDialogProps = {
  ids: number[];
  onDelete?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactElement<ComponentProps<typeof AlertDialog.Trigger>>;
};

export function DeleteLinkPagesDialog({
  open,
  onOpenChange,
  children,
  ids,
  onDelete,
}: DeleteLinkPagesDialogProps) {
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
}: Pick<DeleteLinkPagesDialogProps, 'ids' | 'onDelete'>) {
  const deleteLinkPages = useMutation(deleteLinkPagesOptions());

  const handleDelete = () => {
    deleteLinkPages.mutate(ids, {
      onSuccess: () => {
        onDelete?.();
        toast(
          message('[one Link page|other :count link pages] deleted', {
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
            message="Delete [one link page|other :count link pages]"
            values={{count: ids.length}}
          />
        </AlertDialog.Title>
        <AlertDialog.Description>
          <Trans
            message="Are you sure you want to delete [one this link page|other selected link pages]?"
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
          disabled={deleteLinkPages.isPending}
          onClick={() => handleDelete()}
        >
          <Trans message="Delete" />
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
}

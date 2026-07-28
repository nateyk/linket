import {deleteFoldersOptions} from '@app/dashboard/folders/folders-queries';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ComponentProps, ReactElement} from 'react';

type DeleteFoldersDialogProps = {
  folderIds: (number | string)[];
  onDelete?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactElement<ComponentProps<typeof AlertDialog.Trigger>>;
};

export function DeleteFoldersDialog({
  open,
  onOpenChange,
  children,
  folderIds,
  onDelete,
}: DeleteFoldersDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <DialogContent folderIds={folderIds} onDelete={onDelete} />
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function DialogContent({
  folderIds,
  onDelete,
}: Pick<DeleteFoldersDialogProps, 'folderIds' | 'onDelete'>) {
  const deleteFolders = useMutation(deleteFoldersOptions());

  const handleDelete = () => {
    deleteFolders.mutate(folderIds, {
      onSuccess: () => {
        onDelete?.();
        toast.success(
          <Trans
            message="[one Folder|other :count folders] deleted"
            values={{count: folderIds.length}}
          />,
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
            message="Delete [one folder|other :count folders]"
            values={{count: folderIds.length}}
          />
        </AlertDialog.Title>
        <AlertDialog.Description>
          <Trans
            message="Are you sure you want to delete [one this folder|other selected folders]?"
            values={{count: folderIds.length}}
          />
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>
          <Trans message="Cancel" />
        </AlertDialog.Cancel>
        <AlertDialog.Action
          color="danger"
          disabled={deleteFolders.isPending}
          onClick={() => handleDelete()}
        >
          <Trans message="Delete" />
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
}

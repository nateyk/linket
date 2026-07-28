import {
  archiveFoldersOptions,
  unarchiveFoldersOptions,
} from '@app/dashboard/folders/folders-queries';
import {Folder} from '@app/gen/schemas/folder';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ComponentProps, ReactElement} from 'react';

type Props = {
  folders: Folder[];
  unarchive: boolean;
  onSuccess: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactElement<ComponentProps<typeof AlertDialog.Trigger>>;
};

export function ArchiveFoldersDialog({
  open,
  onOpenChange,
  children,
  folders,
  unarchive,
  onSuccess,
}: Props) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <DialogContent
          folders={folders}
          unarchive={unarchive}
          onSuccess={onSuccess}
        />
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function DialogContent({
  folders,
  unarchive,
  onSuccess,
}: Pick<Props, 'folders' | 'unarchive' | 'onSuccess'>) {
  const archiveFolders = useMutation(archiveFoldersOptions());
  const unarchiveFolders = useMutation(unarchiveFoldersOptions());
  const mutation = unarchive ? unarchiveFolders : archiveFolders;

  const handleConfirm = () => {
    mutation.mutate(
      folders.map(folder => folder.id),
      {
        onSuccess: () => {
          onSuccess();
          toast.success(
            unarchive ? (
              <Trans
                message="[one Folder unarchived|other :count folders unarchived]"
                values={{count: folders.length}}
              />
            ) : (
              <Trans
                message="[one Folder archived|other :count folders archived]"
                values={{count: folders.length}}
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
              message="Unarchive [one folder|other :count folders]"
              values={{count: folders.length}}
            />
          ) : (
            <Trans
              message="Archive [one folder|other :count folders]"
              values={{count: folders.length}}
            />
          )}
        </AlertDialog.Title>
        <AlertDialog.Description>
          {unarchive ? (
            <Trans
              message="Are you sure you want to unarchive [one this folder|other selected folders]?"
              values={{count: folders.length}}
            />
          ) : (
            <Trans
              message="Are you sure you want to archive [one this folder|other selected folders]?"
              values={{count: folders.length}}
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

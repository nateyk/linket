import {detachFolderLinksOptions} from '@app/dashboard/folders/folders-queries';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {useControlledState} from '@react-stately/utils';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {useMutation} from '@tanstack/react-query';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {toast} from '@ui/toast/toast';
import {ComponentProps, ReactElement} from 'react';
import {useParams} from 'react-router';

type Props = {
  linkIds: (number | string)[];
  onDetach?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactElement<ComponentProps<typeof AlertDialog.Trigger>>;
};

export function DetachLinksDialog({
  open: propsOpen,
  onOpenChange: propsOnOpenChange,
  children,
  linkIds,
  onDetach,
}: Props) {
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
        <DialogContent linkIds={linkIds} onDetach={onDetach} />
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function DialogContent({
  linkIds,
  onDetach,
}: Pick<Props, 'linkIds' | 'onDetach'>) {
  const {folderId} = useParams();
  const detachLinks = useMutation(detachFolderLinksOptions(Number(folderId)));

  const handleDetach = () => {
    detachLinks.mutate(
      {linkIds: linkIds.map(Number)},
      {
        onSuccess: () => {
          toast(
            message('[one Link|other :count links] removed from folder', {
              values: {count: linkIds.length},
            }),
          );
          onDetach?.();
        },
        onError: err => showHttpErrorToast(err),
      },
    );
  };

  return (
    <AlertDialog.Content size="sm">
      <AlertDialog.Header>
        <AlertDialog.Title>
          <Trans
            message="Remove [one link|other :count links] from folder"
            values={{count: linkIds.length}}
          />
        </AlertDialog.Title>
        <AlertDialog.Description>
          <Trans
            message="Are you sure you want to remove [one this link|other selected links] from the folder?"
            values={{count: linkIds.length}}
          />
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>
          <Trans message="Cancel" />
        </AlertDialog.Cancel>
        <AlertDialog.Action
          color="danger"
          disabled={detachLinks.isPending}
          onClick={() => handleDetach()}
        >
          <Trans message="Remove" />
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
}

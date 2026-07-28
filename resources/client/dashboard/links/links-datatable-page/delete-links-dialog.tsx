import {deleteLinksOptions} from '@app/dashboard/links/links-queries';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ComponentProps, ReactElement} from 'react';

type Props = {
  linkIds: (number | string)[];
  onDelete: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactElement<ComponentProps<typeof AlertDialog.Trigger>>;
};

export function DeleteLinksDialog({
  open,
  onOpenChange,
  children,
  linkIds,
  onDelete,
}: Props) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <DialogContent linkIds={linkIds} onDelete={onDelete} />
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function DialogContent({
  linkIds,
  onDelete,
}: Pick<Props, 'linkIds' | 'onDelete'>) {
  const deleteLinks = useMutation(deleteLinksOptions());

  const handleDelete = () => {
    deleteLinks.mutate(linkIds, {
      onSuccess: () => {
        onDelete();
        toast.success(
          <Trans
            message="[one Link|other :count links] deleted"
            values={{count: linkIds.length}}
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
            message="Delete [one link|other :count links]"
            values={{count: linkIds.length}}
          />
        </AlertDialog.Title>
        <AlertDialog.Description>
          <Trans
            message="Are you sure you want to delete [one this link|other selected links]?"
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
          disabled={deleteLinks.isPending}
          onClick={() => handleDelete()}
        >
          <Trans message="Delete" />
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
}

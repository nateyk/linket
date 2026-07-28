import {deleteBiolinkOptions} from '@app/dashboard/biolink/biolinks-queries';
import {Biolink} from '@app/gen/schemas/biolink';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ComponentProps, ReactElement} from 'react';

type DeleteBiolinksDialogProps = {
  biolink: Biolink;
  onDelete?: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children?: ReactElement<ComponentProps<typeof AlertDialog.Trigger>>;
};

export function DeleteBiolinksDialog({
  open,
  onOpenChange,
  children,
  biolink,
  onDelete,
}: DeleteBiolinksDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <DialogContent biolink={biolink} onDelete={onDelete} />
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function DialogContent({
  biolink,
  onDelete,
}: Pick<DeleteBiolinksDialogProps, 'biolink' | 'onDelete'>) {
  const deleteBiolinks = useMutation(deleteBiolinkOptions());

  const handleDelete = () => {
    deleteBiolinks.mutate(biolink.id, {
      onSuccess: () => {
        onDelete?.();
        toast.success(<Trans message="Biolink deleted" />);
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <AlertDialog.Content size="sm">
      <AlertDialog.Header>
        <AlertDialog.Title>
          <Trans message="Delete biolink" />
        </AlertDialog.Title>
        <AlertDialog.Description>
          <Trans message="Are you sure you want to delete this biolink?" />
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>
          <Trans message="Cancel" />
        </AlertDialog.Cancel>
        <AlertDialog.Action
          color="danger"
          disabled={deleteBiolinks.isPending}
          onClick={() => handleDelete()}
        >
          <Trans message="Delete" />
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
}

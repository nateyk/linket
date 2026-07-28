import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {deleteWorkspaceOptions} from '@common/workspace/workspace-queries';
import {useControlledState} from '@react-stately/utils';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ComponentProps, ReactElement} from 'react';
import {useNavigate} from 'react-router';

type Props = {
  workspaceId: number;
  children?: ReactElement<ComponentProps<typeof AlertDialog.Trigger>>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function DeleteWorkspaceDialog({
  workspaceId,
  children,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: Props) {
  const [open, onOpenChange] = useControlledState(
    openProp,
    false,
    onOpenChangeProp,
  );

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <DeleteWorkspaceDialogContent
          workspaceId={workspaceId}
          onDelete={() => onOpenChange(false)}
        />
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function DeleteWorkspaceDialogContent({
  workspaceId,
  onDelete,
}: {
  workspaceId: number;
  onDelete: () => void;
}) {
  const navigate = useNavigate();
  const deleteWorkspace = useMutation(deleteWorkspaceOptions());

  const handleDelete = () => {
    deleteWorkspace.mutate(workspaceId, {
      onSuccess: () => {
        onDelete();
        navigate('/account-settings/workspaces');
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <AlertDialog.Content size="sm">
      <AlertDialog.Header>
        <AlertDialog.Title>
          <Trans message="Delete workspace" />
        </AlertDialog.Title>
        <AlertDialog.Description>
          <Trans message="Are you sure you want to delete this workspace?" />
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>
          <Trans message="Cancel" />
        </AlertDialog.Cancel>
        <AlertDialog.Action
          color="danger"
          disabled={deleteWorkspace.isPending}
          onClick={handleDelete}
        >
          <Trans message="Delete" />
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
}

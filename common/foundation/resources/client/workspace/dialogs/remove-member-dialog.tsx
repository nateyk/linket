import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {removeWorkspaceMemberOptions} from '@common/workspace/workspace-queries';
import {useControlledState} from '@react-stately/utils';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ComponentProps, ReactElement} from 'react';

type Props = {
  workspaceId: number;
  memberId: number;
  children?: ReactElement<ComponentProps<typeof AlertDialog.Trigger>>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function RemoveMemberDialog({
  workspaceId,
  memberId,
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
        <RemoveMemberDialogContent
          workspaceId={workspaceId}
          memberId={memberId}
          onRemove={() => onOpenChange(false)}
        />
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function RemoveMemberDialogContent({
  workspaceId,
  memberId,
  onRemove,
}: {
  workspaceId: number;
  memberId: number;
  onRemove: () => void;
}) {
  const removeMember = useMutation(removeWorkspaceMemberOptions(workspaceId));

  const handleRemove = () => {
    removeMember.mutate(memberId, {
      onSuccess: () => {
        toast.success(<Trans message="Member removed" />);
        onRemove();
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <AlertDialog.Content>
      <AlertDialog.Header>
        <AlertDialog.Title>
          <Trans message="Remove member" />
        </AlertDialog.Title>
        <AlertDialog.Description>
          <Trans message="Are you sure you want to remove this member?" />
          <div className="mt-2">
            <Trans message="All workspace resources created by them will be transferred to workspace owner." />
          </div>
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>
          <Trans message="Cancel" />
        </AlertDialog.Cancel>
        <AlertDialog.Action
          color="danger"
          disabled={removeMember.isPending}
          onClick={handleRemove}
        >
          <Trans message="Remove" />
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
}

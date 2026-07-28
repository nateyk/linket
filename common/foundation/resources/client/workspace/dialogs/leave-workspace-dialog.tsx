import {useAuth} from '@common/auth/use-auth';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {queryClient} from '@common/http/query-client';
import {
  removeWorkspaceMemberOptions,
  workspacesBaseKey,
} from '@common/workspace/workspace-queries';
import {useWorkspaceStore} from '@common/workspace/workspace-store';
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

export function LeaveWorkspaceDialog({
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
        <LeaveWorkspaceDialogContent
          workspaceId={workspaceId}
          onLeave={() => onOpenChange(false)}
        />
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function LeaveWorkspaceDialogContent({
  workspaceId,
  onLeave,
}: {
  workspaceId: number;
  onLeave: () => void;
}) {
  const {user} = useAuth();
  const navigate = useNavigate();
  const activeWorkspace = useWorkspaceStore(s => s.activeWorkspace);
  const setPersonalAsActive = useWorkspaceStore(s => s.setPersonalAsActive);
  const leaveWorkspace = useMutation(removeWorkspaceMemberOptions(workspaceId));

  const handleLeave = () => {
    if (!user) return;
    leaveWorkspace.mutate(user.id, {
      onSuccess: () => {
        if (activeWorkspace?.id === workspaceId) {
          setPersonalAsActive();
          queryClient.invalidateQueries();
        } else {
          queryClient.invalidateQueries({
            queryKey: workspacesBaseKey,
          });
        }

        onLeave();
        navigate('/account-settings/workspaces');
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <AlertDialog.Content size="sm">
      <AlertDialog.Header>
        <AlertDialog.Title>
          <Trans message="Leave workspace" />
        </AlertDialog.Title>
        <AlertDialog.Description>
          <Trans message="Are you sure you want to leave this workspace?" />
          <div className="mt-2 font-semibold">
            <Trans message="All resources you've created in the workspace will be transferred to workspace owner." />
          </div>
        </AlertDialog.Description>
      </AlertDialog.Header>
      <AlertDialog.Footer>
        <AlertDialog.Cancel>
          <Trans message="Cancel" />
        </AlertDialog.Cancel>
        <AlertDialog.Action
          color="danger"
          disabled={leaveWorkspace.isPending}
          onClick={handleLeave}
        >
          <Trans message="Leave" />
        </AlertDialog.Action>
      </AlertDialog.Footer>
    </AlertDialog.Content>
  );
}

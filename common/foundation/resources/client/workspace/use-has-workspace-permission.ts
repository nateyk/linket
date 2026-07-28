import {Workspace} from '@app/gen/schemas/workspace';
import {useAuth} from '@common/auth/use-auth';

type Permission =
  | 'workspace_members.update'
  | 'workspace_members.invite'
  | 'workspace_members.delete'
  | string;

export function useHasWorkspacePermission(
  workspace: Workspace,
  permission: Permission,
): boolean {
  const {user: authUser} = useAuth();

  const member = workspace.members?.find(mb => mb.id === authUser?.id);

  if (member) {
    return (
      member.is_owner || !!member.permissions?.find(p => p.name === permission)
    );
  }

  return false;
}

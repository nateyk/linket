import {ChangeWorkspaceInviteRoleBody} from '@app/gen/schemas/change-workspace-invite-role-body';
import {ChangeWorkspaceMemberRoleBody} from '@app/gen/schemas/change-workspace-member-role-body';
import {InviteWorkspaceMembersBody} from '@app/gen/schemas/invite-workspace-members-body';
import {UpdateWorkspaceBody} from '@app/gen/schemas/update-workspace-body';
import {
  changeWorkspaceInviteRole,
  changeWorkspaceMemberRole,
  createWorkspace,
  deleteWorkspace,
  deleteWorkspaceInvite,
  inviteWorkspaceMembers,
  joinWorkspace,
  listWorkspaceInvites,
  listWorkspaceMembers,
  listWorkspaces,
  removeWorkspaceMember,
  resendWorkspaceInvite,
  retrieveWorkspace,
  updateWorkspace,
} from '@app/gen/workspaces';
import {listRolesOptions} from '@common/admin/roles/roles-queries';
import {queryClient} from '@common/http/query-client';
import {useWorkspaceStore} from '@common/workspace/workspace-store';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {FirstParam, SecondParam} from '@ui/utils/ts/extract-params';

export const workspacesBaseKey = ['workspaces'];

export const listWorkspacesOptions = () => {
  return queryOptions({
    queryKey: workspacesBaseKey,
    queryFn: () => listWorkspaces(),
    initialData: () => {
      const bootstrapWorkspaces = getBootstrapData().workspaces;
      if (bootstrapWorkspaces) {
        return {data: bootstrapWorkspaces};
      }
    },
  });
};

export const retrieveWorkspaceOptions = (id: number) => {
  return queryOptions({
    queryKey: [...workspacesBaseKey, `${id}`],
    queryFn: () => retrieveWorkspace(id),
  });
};

export const createWorkspaceOptions = () => {
  return mutationOptions({
    mutationFn: (payload: FirstParam<typeof createWorkspace>) =>
      createWorkspace(payload),
    onSuccess: response => {
      useWorkspaceStore.getState().setWorkspaces(response.data);
    },
  });
};

export const updateWorkspaceOptions = (workspaceId: number) => {
  return mutationOptions({
    mutationFn: (payload: UpdateWorkspaceBody) =>
      updateWorkspace(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspacesBaseKey,
      });
    },
  });
};

export const deleteWorkspaceOptions = () =>
  mutationOptions({
    mutationFn: (workspaceId: number) => deleteWorkspace(workspaceId),
    onSuccess: async (response, workspaceId) => {
      const state = useWorkspaceStore.getState();
      const activeWorkspace = state.activeWorkspace;

      state.setWorkspaces(response.data);

      // if user deleted workspace that is currently active, switch to personal workspace
      if (activeWorkspace && activeWorkspace.id === workspaceId) {
        state.setPersonalAsActive();
        queryClient.invalidateQueries();
      } else {
        queryClient.invalidateQueries({
          queryKey: workspacesBaseKey,
        });
      }
    },
  });

export const listWorkspaceRolesOptions = () =>
  listRolesOptions({type: 'workspace'});

export const listWorkspaceMembersOptions = (workspaceId: number) => {
  return queryOptions({
    queryKey: [...workspacesBaseKey, `${workspaceId}`, 'members'],
    queryFn: () => listWorkspaceMembers(workspaceId),
  });
};

export const listWorkspaceInvitesOptions = (workspaceId: number) => {
  return queryOptions({
    queryKey: [...workspacesBaseKey, `${workspaceId}`, 'invites'],
    queryFn: () => listWorkspaceInvites(workspaceId),
  });
};

export const joinWorkspaceOptions = () => {
  return mutationOptions({
    mutationFn: (inviteId: FirstParam<typeof joinWorkspace>) =>
      joinWorkspace(inviteId),
    onSuccess: async response => {
      useWorkspaceStore.getState().setWorkspaces(response.data);
      useWorkspaceStore.getState().setActiveWorkspace(response.workspaceId);

      // invalidate everything after changing active workspace
      queryClient.invalidateQueries();
    },
  });
};

export const removeWorkspaceMemberOptions = (workspaceId: number) => {
  return mutationOptions({
    mutationFn: (userId: number) => removeWorkspaceMember(workspaceId, userId),
    onSuccess: async response => {
      const state = useWorkspaceStore.getState();
      state.setWorkspaces(response.data);

      // if user left workspace that is currently active, switch to personal workspace
      if (!state.workspaces.find(w => w.id === state.activeWorkspace?.id)) {
        state.setPersonalAsActive();
        queryClient.invalidateQueries();
      } else {
        queryClient.invalidateQueries({
          queryKey: workspacesBaseKey,
        });
      }
    },
  });
};

export const changeWorkspaceMemberRoleOptions = (workspaceId: number) => {
  return mutationOptions({
    mutationFn: ({
      memberId,
      ...body
    }: ChangeWorkspaceMemberRoleBody & {memberId: number}) =>
      changeWorkspaceMemberRole(workspaceId, memberId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspacesBaseKey,
      });
    },
  });
};

export const inviteWorkspaceMembersOptions = (workspaceId: number) => {
  return mutationOptions({
    mutationFn: (payload: InviteWorkspaceMembersBody) =>
      inviteWorkspaceMembers(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspacesBaseKey,
      });
    },
  });
};

export const resendWorkspaceInviteOptions = (
  workspaceId: FirstParam<typeof resendWorkspaceInvite>,
) => {
  return mutationOptions({
    mutationFn: (inviteId: SecondParam<typeof resendWorkspaceInvite>) =>
      resendWorkspaceInvite(workspaceId, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspacesBaseKey,
      });
    },
  });
};

export const changeWorkspaceInviteRoleOptions = (workspaceId: number) => {
  return mutationOptions({
    mutationFn: ({
      inviteId,
      ...body
    }: ChangeWorkspaceInviteRoleBody & {inviteId: string}) =>
      changeWorkspaceInviteRole(workspaceId, inviteId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspacesBaseKey,
      });
    },
  });
};

export const deleteWorkspaceInviteOptions = () =>
  mutationOptions({
    mutationFn: (inviteId: FirstParam<typeof deleteWorkspaceInvite>) =>
      deleteWorkspaceInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: workspacesBaseKey,
      });
    },
  });

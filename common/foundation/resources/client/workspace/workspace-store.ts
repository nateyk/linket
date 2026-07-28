import {Workspace} from '@app/gen/schemas/workspace';
import {auth} from '@common/auth/use-auth';
import {getCookie, setCookie} from '@ui/utils/hooks/use-cookie';
import {create} from 'zustand';
import {subscribeWithSelector} from 'zustand/middleware';

type WorkspaceState = {
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  setActiveWorkspace: (id: number) => void;
  setPersonalAsActive: () => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  init: (workspaces: Workspace[]) => void;
};

export const useWorkspaceStore = create<WorkspaceState>()(
  subscribeWithSelector((set, get) => ({
    workspaces: [],
    activeWorkspace: null,
    setActiveWorkspace: id => {
      if (id === get().activeWorkspace?.id) return;

      const workspaces = get().workspaces;
      const workspace =
        workspaces.find(workspace => workspace.id === id) ??
        workspaces.find(workspace => workspace.is_personal);

      if (workspace) {
        setCookie(workspaceCookieName(), `${workspace.id}`);
        set({activeWorkspace: workspace});
      }
    },
    setPersonalAsActive: () => {
      const personalWorkspace = get().workspaces.find(
        workspace => workspace.is_personal,
      );
      if (personalWorkspace) {
        get().setActiveWorkspace(personalWorkspace.id);
      }
    },
    setWorkspaces: (workspaces: Workspace[]) => {
      set({workspaces});
    },
    init: workspaces => {
      const workspaceId = getCookie(workspaceCookieName());
      let activeWorkspace: Workspace | undefined = undefined;

      // first try the workspace from cookie
      if (workspaceId) {
        activeWorkspace = workspaces.find(
          workspace => `${workspace.id}` === `${workspaceId}`,
        );
      }

      // if no workspace from cookie, default to personal workspace
      if (!activeWorkspace) {
        activeWorkspace = workspaces.find(workspace => workspace.is_personal);
        if (activeWorkspace) {
          setCookie(workspaceCookieName(), `${activeWorkspace.id}`);
        }
      }

      set({workspaces, activeWorkspace: activeWorkspace ?? null});
    },
  })),
);

// make sure cookie is unique to the account user is currently logged in with,
// so that logging in to another account doesn't affect the workspace cookie
function workspaceCookieName(): string {
  return `workspace_id_${auth.user!.id}`;
}

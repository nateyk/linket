import {Workspace} from '@app/gen/schemas/workspace';
import {useAuth} from '@common/auth/use-auth';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {DeleteWorkspaceDialog} from '@common/workspace/dialogs/delete-workspace-dialog';
import {InviteMembersDialog} from '@common/workspace/dialogs/invite-members-dialog';
import {LeaveWorkspaceDialog} from '@common/workspace/dialogs/leave-workspace-dialog';
import {UpdateWorkspaceDialog} from '@common/workspace/dialogs/update-workspace-dialog';
import {useHasWorkspacePermission} from '@common/workspace/use-has-workspace-permission';
import {retrieveWorkspaceOptions} from '@common/workspace/workspace-queries';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Tabs} from '@shadcn/tabs/tabs';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {MoreVerticalIcon, PencilIcon, Trash2} from 'lucide-react';
import {useState} from 'react';
import {Outlet, useLocation} from 'react-router';

export function Component() {
  const {workspaceId} = useRequiredParams(['workspaceId']);
  const query = useSuspenseQuery(retrieveWorkspaceOptions(Number(workspaceId)));
  const {pathname} = useLocation();
  const selectedTab = pathname.endsWith('/invites') ? 'invites' : 'members';
  const workspace = query.data.data;

  const canInvite = useHasWorkspacePermission(
    workspace,
    'workspace_members.invite',
  );

  return (
    <DashboardLayout.MainSection>
      <StaticPageTitle>{workspace.name}</StaticPageTitle>

      <DashboardLayout.SectionHeader className="border-none">
        <DashboardLayout.SidebarToggle />
        <Breadcrumb className="text-xl">
          <Breadcrumb.Item>
            <Breadcrumb.Link to="/account-settings/workspaces">
              <Trans message="Workspaces" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>{workspace.name}</Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb>
        {canInvite && (
          <InviteMembersDialog workspaceId={workspace.id}>
            <Dialog.Trigger render={<Button variant="outline" />}>
              <Trans message="Invite members" />
            </Dialog.Trigger>
          </InviteMembersDialog>
        )}
        <WorkspaceActions workspace={workspace} />
      </DashboardLayout.SectionHeader>
      <Tabs.Root value={selectedTab}>
        <div className="mx-5 border-b">
          <Tabs.List variant="line">
            <Tabs.LinkTab
              value="members"
              to={`/account-settings/workspaces/${workspaceId}`}
            >
              <Trans message="Members" />
            </Tabs.LinkTab>
            <Tabs.LinkTab
              value="invites"
              to={`/account-settings/workspaces/${workspaceId}/invites`}
            >
              <Trans message="Invites" />
            </Tabs.LinkTab>
          </Tabs.List>
        </div>
        <DashboardLayout.SectionContent>
          <Outlet />
        </DashboardLayout.SectionContent>
      </Tabs.Root>
    </DashboardLayout.MainSection>
  );
}

function WorkspaceActions({workspace}: {workspace: Workspace}) {
  const {user} = useAuth();
  const isOwner = workspace.owner_id === user?.id;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  if (isOwner) {
    return (
      <>
        <DeleteWorkspaceDialog
          workspaceId={workspace.id}
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
        />
        <UpdateWorkspaceDialog
          workspace={workspace}
          open={updateDialogOpen}
          onOpenChange={setUpdateDialogOpen}
        />
        <Dropdown>
          <Dropdown.Trigger render={<Button variant="outline" size="icon" />}>
            <MoreVerticalIcon />
          </Dropdown.Trigger>
          <Dropdown.Content>
            <Dropdown.Item onClick={() => setUpdateDialogOpen(true)}>
              <PencilIcon />
              <Trans message="Edit" />
            </Dropdown.Item>
            <Dropdown.Separator />
            <Dropdown.Item
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 />
              <Trans message="Delete" />
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown>
      </>
    );
  }

  return (
    <LeaveWorkspaceDialog workspaceId={workspace.id}>
      <Dialog.Trigger
        render={<Button variant="outline" color="danger" size="sm" />}
      >
        <Trans message="Leave" />
      </Dialog.Trigger>
    </LeaveWorkspaceDialog>
  );
}

import {Workspace} from '@app/gen/schemas/workspace';
import {PolicyFailMessage} from '@common/billing/upgrade/policy-fail-message';
import {queryClient} from '@common/http/query-client';
import {useHasWorkspacePermission} from '@common/workspace/use-has-workspace-permission';
import {Alert} from '@shadcn/alert/alert';
import {Avatar} from '@shadcn/avatar/avatar';
import {Button, LinkButton} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Popover} from '@shadcn/popover/popover';
import {Trans} from '@ui/i18n/trans';
import {AddIcon} from '@ui/icons/material/Add';
import {CheckIcon} from '@ui/icons/material/Check';
import {PersonAddIcon} from '@ui/icons/material/PersonAdd';
import {UnfoldMoreIcon} from '@ui/icons/material/UnfoldMore';
import {cn} from '@ui/utils/cn';
import {ChevronRightIcon, SettingsIcon, UsersIcon} from 'lucide-react';
import {Fragment, useState} from 'react';
import {useAuth} from '../auth/use-auth';
import {CreateWorkspaceDialog} from './dialogs/create-workspace-dialog';
import {useWorkspaceStore} from './workspace-store';

export function WorkspaceSelector({className}: {className?: string}) {
  const workspaces = useWorkspaceStore(s => s.workspaces);
  const setActiveWorkspace = useWorkspaceStore(s => s.setActiveWorkspace);
  const activeWorkspace = useWorkspaceStore(s => s.activeWorkspace);
  const [open, setOpen] = useState(false);
  const {hasPermission} = useAuth();

  if (!activeWorkspace || !hasPermission('workspaces.create')) return null;

  const handleChangeWorkspace = (workspaceId: number) => {
    setActiveWorkspace(workspaceId);
    setOpen(false);

    // invalidate everything after changing active workspace
    queryClient.invalidateQueries();
  };

  return (
    <>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger
          render={
            <Button
              variant="ghost"
              className={cn(
                'justify-start hover:bg-sidebar-accent data-pressed:bg-sidebar-accent',
                className,
              )}
            />
          }
        >
          <Avatar.Root size="sm">
            {activeWorkspace.image && (
              <Avatar.Image src={activeWorkspace.image} />
            )}
            <Avatar.ColorFallback>{activeWorkspace.name}</Avatar.ColorFallback>
          </Avatar.Root>
          {activeWorkspace?.name}
          <UnfoldMoreIcon data-icon="inline-end" className="ml-auto" />
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Content>
            <Popover.Header className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Avatar.Root>
                  {activeWorkspace.image && (
                    <Avatar.Image src={activeWorkspace.image} />
                  )}
                  <Avatar.ColorFallback>
                    {activeWorkspace.name}
                  </Avatar.ColorFallback>
                </Avatar.Root>
                <div className="min-w-0 flex-1">
                  <Popover.Title className="truncate text-sm font-medium">
                    {activeWorkspace.name}
                  </Popover.Title>
                  <Popover.Description className="truncate text-xs text-muted-foreground">
                    <Trans
                      message=":count members"
                      values={{count: activeWorkspace.members_count}}
                    />
                  </Popover.Description>
                </div>
              </div>
              <div className="flex gap-2">
                <SettingsButtons />
              </div>
            </Popover.Header>

            <div className="h-px w-full bg-border" />

            <div className="-ml-2 scrollbar-thin overflow-y-auto">
              <LinkButton
                variant="ghost"
                className="mb-1 text-sm"
                to="/account-settings/workspaces"
              >
                <Trans message="Your workspaces" />
                <ChevronRightIcon data-icon="inline-end" />
              </LinkButton>
              {workspaces?.map(workspace => {
                const isActive = workspace.id === activeWorkspace.id;
                return (
                  <Button
                    key={workspace.id}
                    onClick={() => handleChangeWorkspace(workspace.id)}
                    variant="ghost"
                    className={cn(
                      'w-full justify-start',
                      isActive && 'bg-accent',
                    )}
                  >
                    <Avatar.Root className="size-5">
                      {workspace.image && (
                        <Avatar.Image src={workspace.image} />
                      )}
                      <Avatar.ColorFallback className="text-xs">
                        {workspace.name}
                      </Avatar.ColorFallback>
                    </Avatar.Root>
                    {workspace.is_personal ? (
                      <Trans message="Personal" />
                    ) : (
                      workspace.name
                    )}
                    {isActive && (
                      <CheckIcon className="ml-auto" data-icon="inline-end" />
                    )}
                  </Button>
                );
              })}
              <CreateWorkspaceButton />
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </>
  );
}

function CreateWorkspaceButton() {
  const workspaces = useWorkspaceStore(s => s.workspaces);
  const [open, setOpen] = useState(false);
  const setActiveWorkspace = useWorkspaceStore(s => s.setActiveWorkspace);
  const {checkOverQuotaOrNoPermission} = useAuth();
  const failReason = checkOverQuotaOrNoPermission(
    'workspaces.create',
    'count',
    workspaces.length,
  );

  const handleChangeWorkspace = (workspace: Workspace) => {
    setActiveWorkspace(workspace.id);

    // invalidate everything after changing active workspace
    queryClient.invalidateQueries();
  };

  return (
    <Fragment>
      <CreateWorkspaceDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={handleChangeWorkspace}
      >
        <Dialog.Trigger
          className="w-full justify-start"
          render={<Button disabled={!!failReason} variant="ghost" />}
        >
          <AddIcon />
          <Trans message="Create workspace" />
        </Dialog.Trigger>
      </CreateWorkspaceDialog>
      {failReason && (
        <Alert.Root className="mt-2">
          <Alert.Description className="text-xs">
            <PolicyFailMessage
              resourcesName={<Trans message="worksapces" />}
              reason={failReason}
              action="create"
            />
          </Alert.Description>
        </Alert.Root>
      )}
    </Fragment>
  );
}

function SettingsButtons() {
  const activeWorkspace = useWorkspaceStore(s => s.activeWorkspace)!;
  const canInvite = useHasWorkspacePermission(
    activeWorkspace,
    'workspace_members.invite',
  );

  if (!canInvite) {
    return (
      <LinkButton
        variant="outline"
        size="xs"
        to={`/account-settings/workspaces/${activeWorkspace.id}`}
      >
        <UsersIcon />
        <Trans message="Members" />
      </LinkButton>
    );
  }

  return (
    <>
      <LinkButton
        variant="outline"
        size="xs"
        to={`/account-settings/workspaces/${activeWorkspace.id}`}
      >
        <SettingsIcon />
        <Trans message="Settings" />
      </LinkButton>
      <LinkButton
        variant="outline"
        size="xs"
        to={`/account-settings/workspaces/${activeWorkspace.id}/invites`}
      >
        <PersonAddIcon />
        <Trans message="Invite members" />
      </LinkButton>
    </>
  );
}

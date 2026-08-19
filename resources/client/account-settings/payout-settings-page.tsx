import {AccountSettingsPageLayout} from '@app/account-settings/account-settings-page-layout';
import {AccountSettingsPanel} from '@common/auth/ui/account-settings/account-settings-panel';
import {WorkspacePayoutsPage} from '@common/workspace/workspace-page/workspace-payouts-page';
import {listWorkspacesOptions} from '@common/workspace/workspace-queries';
import {useWorkspaceStore} from '@common/workspace/workspace-store';
import {Field} from '@shadcn/forms/field';
import {Select} from '@shadcn/forms/select/select';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {WalletCardsIcon} from 'lucide-react';
import {useSearchParams} from 'react-router';

export function Component() {
  const activeWorkspace = useWorkspaceStore(s => s.activeWorkspace);
  const setActiveWorkspace = useWorkspaceStore(s => s.setActiveWorkspace);
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useSuspenseQuery(listWorkspacesOptions());
  const workspaces = query.data.data;
  const workspaceParam = Number(searchParams.get('workspace'));
  const workspace =
    workspaces.find(item => item.id === workspaceParam) ??
    activeWorkspace ??
    workspaces.find(item => item.is_personal) ??
    workspaces[0];

  const selectWorkspace = (workspaceId: string) => {
    setActiveWorkspace(Number(workspaceId));
    setSearchParams(
      params => {
        const nextParams = new URLSearchParams(params);
        nextParams.set('workspace', workspaceId);
        return nextParams;
      },
      {replace: true},
    );
  };

  return (
    <AccountSettingsPageLayout title={<Trans message="Payout settings" />}>
      {workspace ? (
        <div className="space-y-5">
          <div className="flex flex-col gap-4 border-b pb-5 md:flex-row md:items-end md:justify-between">
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <WalletCardsIcon className="size-4" />
                <Trans message="Active workspace" />
              </div>
              <h2 className="truncate text-2xl font-semibold tracking-tight">
                {workspace.name}
              </h2>
              <p className="max-w-2xl text-sm text-muted-foreground">
                <Trans message="Choose the payout method and account details used for this workspace." />
              </p>
            </div>
            {workspaces.length > 1 ? (
              <Field.Root className="w-full md:w-72">
                <Field.Label>
                  <Trans message="Workspace" />
                </Field.Label>
                <Select.Root
                  value={String(workspace.id)}
                  onValueChange={value => selectWorkspace(value ?? '')}
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {workspaces.map(item => (
                      <Select.Item key={item.id} value={String(item.id)}>
                        {item.name}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select.Root>
              </Field.Root>
            ) : null}
          </div>
          <WorkspacePayoutsPage workspaceId={workspace.id} />
        </div>
      ) : (
        <AccountSettingsPanel
          id="no-workspace"
          title={<Trans message="No workspace found" />}
        >
          <p className="text-sm text-muted-foreground">
            <Trans message="Create a workspace before setting up payout details." />
          </p>
        </AccountSettingsPanel>
      )}
    </AccountSettingsPageLayout>
  );
}

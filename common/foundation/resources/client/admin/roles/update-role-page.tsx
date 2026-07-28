import {UpdateRoleBody} from '@app/gen/schemas/update-role-body';
import {DirtyFormSaveDrawer} from '@common/admin/crupdate-resource-layout';
import {Component as RoleSettingsForm} from '@common/admin/roles/role-settings-form';
import {
  retrieveRoleOptions,
  updateRoleOptions,
} from '@common/admin/roles/roles-queries';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Tabs} from '@shadcn/tabs/tabs';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useForm} from 'react-hook-form';
import {Outlet, useLocation} from 'react-router';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';

export function UpdateRolePage() {
  const {roleId} = useRequiredParams(['roleId']);
  const query = useSuspenseQuery(retrieveRoleOptions(Number(roleId)));

  const {pathname} = useLocation();
  const selectedTab = pathname.endsWith('/users') ? 'users' : 'settings';

  const roleTabs = (
    <Tabs.Root value={selectedTab}>
      <div className="mx-6 border-b">
        <Tabs.List variant="line">
          <Tabs.LinkTab
            className="min-w-24"
            value="settings"
            to={`/admin/roles/${roleId}/edit`}
            replace
          >
            <Trans message="Settings" />
          </Tabs.LinkTab>
          <Tabs.LinkTab
            className="min-w-24"
            value="users"
            to={`/admin/roles/${roleId}/edit/users`}
            replace
          >
            <Trans message="Members" />
          </Tabs.LinkTab>
        </Tabs.List>
      </div>
    </Tabs.Root>
  );

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader className="border-none">
        <DashboardLayout.SidebarToggle />
        <Breadcrumb.Root className="text-xl">
          <Breadcrumb.Item>
            <Breadcrumb.Link to="/admin/roles">
              <Trans message="Roles" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>{query.data.data.name}</Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.Root>
      </DashboardLayout.SectionHeader>
      {roleTabs}
      <DashboardLayout.SectionContent>
        <DashboardLayout.ContainedContent>
          <Outlet context={query.data.data} />
        </DashboardLayout.ContainedContent>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

export function UpdateRoleSettingsTab() {
  const {roleId} = useRequiredParams(['roleId']);
  const query = useSuspenseQuery(retrieveRoleOptions(Number(roleId)));
  const form = useForm<UpdateRoleBody>({
    defaultValues: {
      name: query.data.data.name,
      type: query.data.data.type,
      description: query.data.data.description ?? '',
      permissions: query.data.data.permissions ?? [],
    },
  });
  const navigate = useNavigate();
  const updateRole = useMutation(updateRoleOptions(Number(roleId)));

  const handleSubmit = (values: UpdateRoleBody) => {
    updateRole.mutate(values, {
      onSuccess: () => {
        toast.success(<Trans message="Role updated" />);
        navigate('/admin/roles');
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <HookForm.Root
      form={form}
      className="flex h-full flex-col"
      onSubmit={handleSubmit}
    >
      <RoleSettingsForm />
      <DirtyFormSaveDrawer isLoading={updateRole.isPending} />
    </HookForm.Root>
  );
}

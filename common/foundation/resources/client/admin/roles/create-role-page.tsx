import {CreateRoleBody} from '@app/gen/schemas/create-role-body';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useForm} from 'react-hook-form';
import {useSearchParams} from 'react-router';
import {Component as SettingsPanel} from './role-settings-form';
import {createRoleOptions} from './roles-queries';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';

export function Component() {
  const [searchParams] = useSearchParams();
  const defaultType = searchParams.get('type') ?? 'users';
  const form = useForm<CreateRoleBody>({
    defaultValues: {name: '', description: '', type: defaultType},
  });
  const createRole = useMutation(createRoleOptions());
  const navigate = useNavigate();

  const handleSubmit = (values: CreateRoleBody) => {
    createRole.mutate(values, {
      onSuccess: () => {
        toast.success(<Trans message="Created new role" />);
        navigate(`/admin/roles`, {replace: true});
      },
      onError: err => onFormQueryError(err, form),
    });
  };

  return (
    <DashboardLayout.MainSection
      render={<HookForm.Root form={form} onSubmit={handleSubmit} />}
    >
      <StaticPageTitle>
        <Trans message="New role" />
      </StaticPageTitle>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <Breadcrumb.Root className="text-xl">
          <Breadcrumb.Item>
            <Breadcrumb.Link to="/admin/roles">
              <Trans message="Roles" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>
              <Trans message="New" />
            </Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.Root>
        <Button
          variant="default"
          color="primary"
          type="submit"
          disabled={createRole.isPending}
        >
          <Trans message="Create role" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent>
        <DashboardLayout.ContainedContent>
          <SettingsPanel />
        </DashboardLayout.ContainedContent>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

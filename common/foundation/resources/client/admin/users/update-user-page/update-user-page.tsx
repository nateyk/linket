import {UpdateUserPageActions} from '@common/admin/users/update-user-page/update-user-page-actions';
import {UpdateUserPageHeader} from '@common/admin/users/update-user-page/update-user-page-header';
import {
  updateUserPageTabs,
  UpdateUserPageTabs,
} from '@common/admin/users/update-user-page/update-user-page-tabs';
import {retrieveUserForEditPageOptions} from '@common/admin/users/users-queries';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {Breadcrumb} from '@common/shadcn/breadcrumb/breadcrumb';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';

export function Component() {
  const {userId} = useRequiredParams(['userId']);
  const query = useSuspenseQuery(
    retrieveUserForEditPageOptions(Number(userId)),
  );
  const user = query.data.data;

  return (
    <DashboardLayout.MainSection>
      <StaticPageTitle>
        <Trans message="Edit user" />
      </StaticPageTitle>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <Breadcrumb.Root className="text-xl">
          <Breadcrumb.Item>
            <Breadcrumb.Link to=".." relative="path">
              <Trans message="Users" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>{user.name}</Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.Root>
        <UpdateUserPageActions user={user} />
      </DashboardLayout.SectionHeader>
      <div className="flex-1 overflow-y-auto">
        <UpdateUserPageHeader user={user} />
        <UpdateUserPageTabs tabs={updateUserPageTabs} user={user} />
      </div>
    </DashboardLayout.MainSection>
  );
}

import {FolderActionsButton} from '@app/dashboard/folders/folders-datatable-page/folder-actions-button';
import {retrieveFolderOptions} from '@app/dashboard/folders/folders-queries';
import {CreateLinkDialog} from '@app/dashboard/links/dialogs/create-link-dialog';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Tabs} from '@shadcn/tabs/tabs';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import clsx from 'clsx';
import {PlusIcon} from 'lucide-react';
import {Outlet, useLocation, useNavigate} from 'react-router';

export function Component() {
  const navigate = useNavigate();
  const {routeType} = useDatatableRouteType();
  const {folderId} = useRequiredParams(['folderId']);
  const {pathname} = useLocation();
  const query = useSuspenseQuery(retrieveFolderOptions(Number(folderId)));

  const selectedTab = pathname.endsWith('links')
    ? 'content'
    : pathname.endsWith('insights')
      ? 'insights'
      : 'settings';
  const baseUrl = `/${routeType}/folders/${folderId}`;

  const breadcrumb = (
    <Breadcrumb.Root
      className={clsx('text-xl', query.isLoading && 'invisible')}
    >
      <Breadcrumb.Item>
        <Breadcrumb.Link to={`/${routeType}/folders`}>
          <Trans message="Folders" />
        </Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>{query.data.data.name}</Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.Root>
  );

  const headerActions = (
    <>
      <FolderActionsButton
        folder={query.data.data}
        hideDetailsLinks
        variant="outline"
        onDelete={() => navigate(`/${routeType}/folders`)}
        onArchive={() => navigate(`/${routeType}/folders`)}
      />
      <CreateLinkDialog folder={query.data.data}>
        <Dialog.Trigger render={<Button variant="default" color="primary" />}>
          <PlusIcon />
          <Trans message="Add link" />
        </Dialog.Trigger>
      </CreateLinkDialog>
    </>
  );

  const title = query.data.data.name;
  return (
    <>
      <StaticPageTitle>{title}</StaticPageTitle>
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader className="border-none">
          <DashboardLayout.SidebarToggle />
          {breadcrumb}
          {headerActions}
        </DashboardLayout.SectionHeader>
        <Tabs.Root value={selectedTab}>
          <div className="mx-6 border-b">
            <Tabs.List variant="line">
              <Tabs.LinkTab
                className="min-w-25"
                value="settings"
                to={baseUrl}
                replace
              >
                <Trans message="Settings" />
              </Tabs.LinkTab>
              <Tabs.LinkTab
                className="min-w-25"
                value="content"
                to={`${baseUrl}/links`}
                replace
              >
                <Trans message="Content" />
              </Tabs.LinkTab>
              <Tabs.LinkTab
                className="min-w-25"
                value="insights"
                to={`${baseUrl}/insights`}
                replace
              >
                <Trans message="Insights" />
              </Tabs.LinkTab>
            </Tabs.List>
          </div>
        </Tabs.Root>
        <DashboardLayout.SectionContent className="overflow-y-auto">
          <Outlet />
        </DashboardLayout.SectionContent>
      </DashboardLayout.MainSection>
    </>
  );
}

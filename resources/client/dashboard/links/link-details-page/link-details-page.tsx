import {retrieveFolderOptions} from '@app/dashboard/folders/folders-queries';
import {LinkActionsButton} from '@app/dashboard/links/links-datatable-page/link-actions-button';
import {retrieveLinkOptions} from '@app/dashboard/links/links-queries';
import {ShareLinkButton} from '@app/dashboard/links/sharing/share-link-button';
import {
  getLinkeableName,
  LinkeableName,
} from '@app/dashboard/links/utils/linkeable-name';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {Link} from '@app/gen/schemas/link';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Tabs} from '@shadcn/tabs/tabs';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {Outlet, useLocation, useNavigate, useParams} from 'react-router';

export function Component() {
  const {routeType} = useDatatableRouteType();
  const {linkId} = useRequiredParams(['linkId']);
  const {folderId} = useParams();
  const query = useSuspenseQuery(retrieveLinkOptions(Number(linkId)));

  const {pathname} = useLocation();
  const selectedTab = pathname.endsWith('insights') ? 'insights' : 'settings';

  const baseUrl = folderId
    ? `/${routeType}/folders/${folderId}/links/${linkId}`
    : `/${routeType}/links/${linkId}`;

  return (
    <>
      <StaticPageTitle>{getLinkeableName(query.data.data)}</StaticPageTitle>
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader className="border-none">
          <DashboardLayout.SidebarToggle />
          {folderId ? <FolderBreadcrumb /> : <LinkBreadcrumb />}
          <HeaderActions link={query.data.data} />
        </DashboardLayout.SectionHeader>
        <Tabs.Root value={selectedTab}>
          <div className="mx-5 border-b">
            <Tabs.List variant="line">
              <Tabs.LinkTab
                className="min-w-24"
                value="settings"
                to={baseUrl}
                replace
              >
                <Trans message="Settings" />
              </Tabs.LinkTab>
              <Tabs.LinkTab
                className="min-w-24"
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

function FolderBreadcrumb() {
  const {routeType} = useDatatableRouteType();
  const {folderId, linkId} = useRequiredParams(['folderId', 'linkId']);
  const folderQuery = useSuspenseQuery(retrieveFolderOptions(Number(folderId)));
  const linkQuery = useSuspenseQuery(retrieveLinkOptions(Number(linkId)));

  return (
    <Breadcrumb.Root
      className={cn('text-xl', folderQuery.isLoading && 'invisible')}
    >
      <Breadcrumb.Item>
        <Breadcrumb.Link to={`/${routeType}/folders`}>
          <Trans message="Folders" />
        </Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Link to={`/${routeType}/folders/${folderId}`}>
          {folderQuery.data.data.name}
        </Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Link to={`/${routeType}/folders/${folderId}/links`}>
          <Trans message="Links" />
        </Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>
          <LinkeableName linkeable={linkQuery.data.data} />
        </Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.Root>
  );
}

function LinkBreadcrumb() {
  const {routeType} = useDatatableRouteType();
  const {linkId} = useRequiredParams(['linkId']);
  const linkQuery = useSuspenseQuery(retrieveLinkOptions(Number(linkId)));

  return (
    <Breadcrumb.Root className="text-xl">
      <Breadcrumb.Item>
        <Breadcrumb.Link to={`/${routeType}/links`}>
          <Trans message="Links" />
        </Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>
          <LinkeableName linkeable={linkQuery.data.data} />
        </Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.Root>
  );
}

type HeaderActionsProps = {
  link: Link;
};
function HeaderActions({link}: HeaderActionsProps) {
  const {routeType} = useDatatableRouteType();
  const navigate = useNavigate();
  return (
    <div className="flex shrink-0 items-center gap-2.5">
      <LinkActionsButton
        variant="outline"
        link={link}
        hideEditAction
        onDelete={() => navigate(`/${routeType}/links`)}
      />
      <ShareLinkButton
        url={link.short_url}
        qrUrl={link.qr_code?.long_url}
        longUrl={link.long_url}
        type="text"
        variant="outline"
      />
    </div>
  );
}

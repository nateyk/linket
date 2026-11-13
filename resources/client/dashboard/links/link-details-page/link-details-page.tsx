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
import {Button} from '@shadcn/button/button';
import {Tabs} from '@shadcn/tabs/tabs';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {ArrowLeftIcon} from 'lucide-react';
import {Link as RouterLink, Outlet, useLocation, useNavigate, useParams} from 'react-router';

export function Component() {
  const {routeType} = useDatatableRouteType();
  const {linkId} = useRequiredParams(['linkId']);
  const {folderId} = useParams();
  const {trans} = useTrans();
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
        <DashboardLayout.SectionHeader className="max-lg:h-auto max-lg:flex-wrap max-lg:py-2">
          <DashboardLayout.SidebarToggle />
          <Button variant="ghost" size="icon-sm" className="max-lg:size-11" nativeButton={false}
            aria-label={trans({message: 'Back to links'})}
            render={<RouterLink to={folderId ? `/${routeType}/folders/${folderId}/links` : `/${routeType}/links`} />}>
            <ArrowLeftIcon className="rtl:rotate-180" aria-hidden="true" />
          </Button>
          <DashboardLayout.SectionTitle render={<h1 />} className="max-lg:order-3 max-lg:basis-full max-lg:flex-none max-lg:w-full max-lg:text-xl max-lg:overflow-visible max-lg:whitespace-normal max-lg:text-clip">
            <LinkeableName linkeable={query.data.data} />
          </DashboardLayout.SectionTitle>
          <HeaderActions link={query.data.data} />
        </DashboardLayout.SectionHeader>
        <Tabs.Root value={selectedTab}>
          <div className="mx-(--section-spacing) border-b">
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

type HeaderActionsProps = {
  link: Link;
};
function HeaderActions({link}: HeaderActionsProps) {
  const {routeType} = useDatatableRouteType();
  const navigate = useNavigate();
  return (
    <div className="ms-auto flex shrink-0 items-center gap-2.5">
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

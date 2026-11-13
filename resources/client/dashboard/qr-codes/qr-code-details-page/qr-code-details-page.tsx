import {
  getLinkeableName,
  LinkeableName,
} from '@app/dashboard/links/utils/linkeable-name';
import {downloadQrCode} from '@app/dashboard/qr-codes/qr-code-renderer';
import {QrCodeActionsButton} from '@app/dashboard/qr-codes/qr-codes-datatable-page/qr-code-actions-button';
import {retrieveQrCodeOptions} from '@app/dashboard/qr-codes/qr-codes-queries';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {QrCode} from '@app/gen/schemas/qr-code';
import {StaticPageTitle} from '@common/seo/static-page-title';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Button} from '@shadcn/button/button';
import {Tabs} from '@shadcn/tabs/tabs';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {ArrowLeftIcon, DownloadIcon} from 'lucide-react';
import {Link, Outlet, useLocation, useNavigate} from 'react-router';

export function Component() {
  const {routeType} = useDatatableRouteType();
  const {qrCodeId} = useRequiredParams(['qrCodeId']);
  const {trans} = useTrans();
  const query = useSuspenseQuery(retrieveQrCodeOptions(Number(qrCodeId)));

  const {pathname} = useLocation();
  const selectedTab = pathname.endsWith('insights') ? 'insights' : 'settings';
  const baseUrl = `/${routeType}/qr-codes/${qrCodeId}`;

  return (
    <>
      <StaticPageTitle>{getLinkeableName(query.data.data)}</StaticPageTitle>
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader className="max-lg:h-auto max-lg:flex-wrap max-lg:py-2">
          <DashboardLayout.SidebarToggle />
          <Button variant="ghost" size="icon-sm" className="max-lg:size-11" nativeButton={false}
            aria-label={trans({message: 'Back to QR codes'})}
            render={<Link to={`/${routeType}/qr-codes`} />}>
            <ArrowLeftIcon className="rtl:rotate-180" aria-hidden="true" />
          </Button>
          <DashboardLayout.SectionTitle render={<h1 />} className="max-lg:order-3 max-lg:basis-full max-lg:flex-none max-lg:w-full max-lg:text-xl max-lg:overflow-visible max-lg:whitespace-normal max-lg:text-clip">
            <LinkeableName linkeable={query.data.data} />
          </DashboardLayout.SectionTitle>
          <div className="ms-auto flex shrink-0 items-center gap-2">
            <HeaderActions qrCode={query.data.data} />
          </div>
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
  qrCode: QrCode;
};
function HeaderActions({qrCode}: HeaderActionsProps) {
  const {routeType} = useDatatableRouteType();
  const navigate = useNavigate();

  return (
    <>
      <QrCodeActionsButton
        qrCode={qrCode}
        variant="outline"
        size="icon"
        hideDetailsItems
        onDelete={() => navigate(`/${routeType}/qr-codes`)}
      />
      <Button
        variant="outline"
        onClick={() =>
          downloadQrCode({
            qrCode,
            extension: 'png',
          })
        }
      >
        <DownloadIcon />
        <Trans message="Download" />
      </Button>
    </>
  );
}

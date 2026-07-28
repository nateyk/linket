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
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Button} from '@shadcn/button/button';
import {Tabs} from '@shadcn/tabs/tabs';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {DownloadIcon} from 'lucide-react';
import {Outlet, useLocation, useNavigate} from 'react-router';

export function Component() {
  const {routeType} = useDatatableRouteType();
  const {qrCodeId} = useRequiredParams(['qrCodeId']);
  const query = useSuspenseQuery(retrieveQrCodeOptions(Number(qrCodeId)));

  const {pathname} = useLocation();
  const selectedTab = pathname.endsWith('insights') ? 'insights' : 'settings';
  const baseUrl = `/${routeType}/qr-codes/${qrCodeId}`;

  return (
    <>
      <StaticPageTitle>{getLinkeableName(query.data.data)}</StaticPageTitle>
      <DashboardLayout.MainSection>
        <DashboardLayout.SectionHeader className="border-none">
          <DashboardLayout.SidebarToggle />
          <QrCodeBreadcrumb />
          <HeaderActions qrCode={query.data.data} />
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

function QrCodeBreadcrumb() {
  const {routeType} = useDatatableRouteType();
  const {qrCodeId} = useRequiredParams(['qrCodeId']);
  const query = useSuspenseQuery(retrieveQrCodeOptions(Number(qrCodeId)));

  return (
    <Breadcrumb.Root className="text-xl">
      <Breadcrumb.Item>
        <Breadcrumb.Link to={`/${routeType}/qr-codes`}>
          <Trans message="QR codes" />
        </Breadcrumb.Link>
      </Breadcrumb.Item>
      <Breadcrumb.Separator />
      <Breadcrumb.Item>
        <Breadcrumb.Page>
          <LinkeableName linkeable={query.data.data} />
        </Breadcrumb.Page>
      </Breadcrumb.Item>
    </Breadcrumb.Root>
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

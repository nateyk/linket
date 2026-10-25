import {helpCenterQueries} from '@app/help-center/help-center-queries';
import {HcSearchBar} from '@app/help-center/search/hc-search-bar';
import {PortalSectionLayout} from '@app/digital-products/public/portal-section-layout';
import {CustomerNewTicketPageData} from '@app/help-center/tickets-portal/new-ticket-page/customer-new-ticket-page-data';
import {TicketForm} from '@app/help-center/tickets-portal/new-ticket-page/form/ticket-form';
import {useTicketsPortalPaths} from '@app/help-center/tickets-portal/tickets-portal-paths';
import {AllCommands} from '@common/admin/settings/preview/commands';
import {listenToSettingsEditorEvents} from '@common/admin/settings/preview/settings-preview-listener';
import {useSettingsPreviewMode} from '@common/admin/settings/preview/use-settings-preview-mode';
import {queryClient} from '@common/http/query-client';
import {Navbar} from '@common/ui/navigation/navbar/navbar';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Breadcrumb} from '@ui/breadcrumbs/breadcrumb';
import {BreadcrumbItem} from '@ui/breadcrumbs/breadcrumb-item';
import {Trans} from '@ui/i18n/trans';
import {useEffect} from 'react';

export function Component() {
  const {isInsideSettingsPreview: isAppearanceEditorActive} =
    useSettingsPreviewMode();
  const navigate = useNavigate();
  const paths = useTicketsPortalPaths();
  const query = useSuspenseQuery(
    helpCenterQueries.customerConversations.newTicketPageData(),
  );

  useEffect(() => {
    if (!isAppearanceEditorActive) return;
    const handler = (command: AllCommands) => {
      if (command.type === 'setValues') {
        queryClient.setQueryData(
          helpCenterQueries.customerConversations.newTicketPageData().queryKey,
          oldData => {
            const appearance = command.values.client?.hc?.newTicket?.appearance;
            if (!oldData || !appearance) return oldData;
            return {
              ...oldData,
              config: appearance,
            };
          },
        );
      }
    };

    return listenToSettingsEditorEvents(handler);
  }, [isAppearanceEditorActive]);

  const form = (
    <div className="flex items-stretch gap-11">
      <main className="min-w-0 grow basis-3/4">
        {paths.surface === 'help-center' ? (
          <h1 className="mb-8.5 mt-3.5 text-3xl font-light">
            <Trans message={query.data.config.title} />
          </h1>
        ) : null}
        <TicketForm data={query.data} />
      </main>
      <Sidebar data={query.data} />
    </div>
  );

  if (paths.surface === 'portal') {
    return (
      <PortalSectionLayout
        title={<Trans message={query.data.config.title} />}
      >
        {form}
      </PortalSectionLayout>
    );
  }

  return (
    <div>
      <Navbar color="bg" menuPosition="header" className="sticky top-0 z-10">
        <HcSearchBar />
      </Navbar>
      <div className="container mx-auto px-3 pb-12 md:px-6">
        <Breadcrumb size="sm" className="mb-8.5 mt-8.5 md:mb-12">
          <BreadcrumbItem onSelected={() => navigate(paths.home)}>
            <Trans message="Help center" />
          </BreadcrumbItem>
          <BreadcrumbItem onSelected={() => navigate(paths.list)}>
            <Trans message="Tickets" />
          </BreadcrumbItem>
          <BreadcrumbItem>
            <Trans message="New ticket" />
          </BreadcrumbItem>
        </Breadcrumb>
        {form}
      </div>
    </div>
  );
}

function Sidebar({data}: {data: CustomerNewTicketPageData}) {
  return (
    <aside className="min-w-80 basis-2/4 border-l px-10 max-md:hidden">
      <h2 className="mb-8.5 text-xl font-medium">
        <Trans message={data.config.sidebarTitle} />
      </h2>
      {data.config.sidebarTips?.map((tip, index) => (
        <div key={index} className="mb-7.5">
          <h3 className="text-lg font-medium">
            <Trans message={tip.title} />
          </h3>
          <p>
            <Trans message={tip.content} />
          </p>
        </div>
      ))}
    </aside>
  );
}

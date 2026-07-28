import {FormattedUrl} from '@app/dashboard/links/utils/formatted-url';
import {useTrackedEventsFilters} from '@app/dashboard/reports/tracked-events-filters';
import {listTrackedEventsOptions} from '@app/dashboard/reports/tracked-events-queries';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {TrackedEvent} from '@app/gen/schemas/tracked-event';
import {Table} from '@common/shadcn/table/table';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Empty} from '@shadcn/empty/empty';
import {BackendPagination} from '@shadcn/table/utils/table-pagination';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {useSuspenseQuery} from '@tanstack/react-query';
import {FormattedCountryName} from '@ui/i18n/formatted-country-name';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {
  Link2Icon,
  MonitorIcon,
  MousePointerClickIcon,
  QrCodeIcon,
  SmartphoneIcon,
  TabletIcon,
} from 'lucide-react';
import {Link as RouteLink} from 'react-router';

export function Component() {
  const {routeType} = useDatatableRouteType();

  const filters = useTrackedEventsFilters();

  const {setQueryState, deferredSearchParams, isFiltering} = useTableQueryState(
    {filters},
  );

  const query = useSuspenseQuery(
    listTrackedEventsOptions(routeType, deferredSearchParams),
  );
  const items = query.data?.data ?? [];

  return (
    <DashboardLayout.SectionScrollContainer>
      {items.length > 0 && (
        <div className="overflow-x-auto rounded-card border">
          <Table.Root className="table-auto lg:table-fixed">
            <Table.Header>
              <Table.Row>
                <Table.Head className="w-1/5 border-r">
                  <Trans message="Date" />
                </Table.Head>
                <Table.Head className="w-1/5 border-r">
                  <Trans message="Link" />
                </Table.Head>
                <Table.Head className="w-1/5 border-r">
                  <Trans message="Referrer" />
                </Table.Head>
                <Table.Head className="w-1/5 border-r">
                  <Trans message="Country" />
                </Table.Head>
                <Table.Head className="w-1/5">
                  <Trans message="Device" />
                </Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {items.map(event => (
                <Table.Row key={event.id}>
                  <Table.Cell className="border-r">
                    <div className="flex min-w-0 items-center gap-2.5 pr-3">
                      {event.event_type === 'click' ? (
                        <MousePointerClickIcon className="size-4" />
                      ) : (
                        <QrCodeIcon className="size-4" />
                      )}
                      <div className="truncate">
                        <FormattedDate date={event.created_at} />
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="border-r">
                    {event.linkeable ? <LinkeableUrl event={event} /> : '-'}
                  </Table.Cell>
                  <Table.Cell className="border-r">
                    <div className="flex min-w-0 items-center gap-2.5 pr-3">
                      <Link2Icon className="size-4" />
                      <div className="max-w-60 truncate lg:max-w-none">
                        {event.referrer ? (
                          <FormattedUrl url={event.referrer} />
                        ) : (
                          <Trans message="(direct)" />
                        )}
                      </div>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="border-r">
                    {event.location ? (
                      <div className="flex items-center gap-2.5">
                        <img
                          className="size-4"
                          src={`https://hatscripts.github.io/circle-flags/flags/${event.location.toLowerCase()}.svg`}
                          alt={event.location}
                        />
                        <div className="min-w-0 truncate">
                          <FormattedCountryName code={event.location} />
                        </div>
                      </div>
                    ) : (
                      <Trans message="Unknown" />
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {event.device ? (
                      <div className="flex items-center gap-2.5">
                        <DeviceIcon device={event.device} />
                        <div className="min-w-0 truncate capitalize">
                          {event.device}
                        </div>
                      </div>
                    ) : (
                      <Trans message="Unknown" />
                    )}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </div>
      )}
      <BackendPagination
        className="mt-4"
        response={query.data}
        onPageChange={page => setQueryState({page})}
        onPageSizeChange={perPage => setQueryState({per_page: perPage})}
      />
      {items.length === 0 ? (
        <TrackedEventsEmptyState isFiltering={isFiltering} />
      ) : null}
    </DashboardLayout.SectionScrollContainer>
  );
}

type DeviceIconProps = {
  device: string;
};
function DeviceIcon({device}: DeviceIconProps) {
  switch (device) {
    case 'desktop':
      return <MonitorIcon className="size-4" />;
    case 'mobile':
      return <SmartphoneIcon className="size-4" />;
    case 'tablet':
      return <TabletIcon className="size-4" />;
  }
}

type LinkeableUrlProps = {
  event: TrackedEvent;
};
function LinkeableUrl({event}: LinkeableUrlProps) {
  const {routeType} = useDatatableRouteType();
  if (!event.linkeable) return null;

  const modelType = event.linkeable?.model_type;
  let uri = '';

  if (modelType === 'link') {
    uri = `links/${event.linkeable.id}`;
  } else if (modelType === 'folder') {
    uri = `folders/${event.linkeable.id}`;
  } else if (modelType === 'biolink') {
    uri = `biolinks/${event.linkeable.id}`;
  } else if (modelType === 'qrCode') {
    uri = `qr-codes/${event.linkeable.id}`;
  }

  if (!event.linkeable.short_url) {
    return null;
  }

  return (
    <RouteLink to={`/${routeType}/${uri}`} className="hover:underline">
      <FormattedUrl url={event.linkeable.short_url} />
    </RouteLink>
  );
}

function TrackedEventsEmptyState({isFiltering}: {isFiltering: boolean}) {
  return (
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <MousePointerClickIcon />
        </Empty.Media>
        <Empty.Title>
          {isFiltering ? (
            <Trans message="No tracked events found" />
          ) : (
            <Trans message="No tracked events yet" />
          )}
        </Empty.Title>
        {isFiltering ? (
          <Empty.Description>
            <Trans message="Try another search query or different filters." />
          </Empty.Description>
        ) : null}
      </Empty.Header>
    </Empty.Root>
  );
}

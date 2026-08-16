import {CreateBiolinkDialog} from '@app/dashboard/biolink/biolink-editor/create-biolink-dialog';
import {listBiolinksOptions} from '@app/dashboard/biolink/biolinks-queries';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {Biolink} from '@app/gen/schemas/biolink';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Empty} from '@shadcn/empty/empty';
import {Item} from '@shadcn/item/item';
import {BackendPagination} from '@shadcn/table/utils/table-pagination';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {useSuspenseQuery} from '@tanstack/react-query';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {FormattedRelativeTime} from '@ui/i18n/formatted-relative-time';
import {Trans} from '@ui/i18n/trans';
import {ignoreEventsFromPortal} from '@ui/utils/dom/ignore-events-from-portal';
import {removeProtocol} from '@ui/utils/urls/remove-protocol';
import {
  BarChart3Icon,
  Clock3Icon,
  EllipsisVerticalIcon,
  LayoutPanelTop,
  MousePointerClick,
  PencilIcon,
  PlusIcon,
} from 'lucide-react';
import {useNavigate} from 'react-router';

export function Component() {
  const {routeType} = useDatatableRouteType();
  const navigate = useNavigate();

  const {queryState, setQueryState} = useTableQueryState({});
  const query = useSuspenseQuery(listBiolinksOptions(routeType, queryState));
  const items = query.data?.data ?? [];

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <div className="mr-auto min-w-0">
          <DashboardLayout.SectionTitle>
            <Trans message="Link in bio" />
          </DashboardLayout.SectionTitle>
          <p className="hidden text-sm text-muted-foreground sm:block">
            <Trans message="Manage your public creator profiles." />
          </p>
        </div>
        <CreateBiolinkDialog>
          <Dialog.Trigger render={<Button variant="default" color="primary" />}>
            <PlusIcon data-icon="inline-start" />
            <Trans message="New profile" />
          </Dialog.Trigger>
        </CreateBiolinkDialog>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent>
        <DashboardLayout.SectionScrollContainer className="mx-0 px-0">
          {items.length > 0 && (
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-3">
              <div className="flex items-center justify-between gap-4 px-1">
                <p className="text-sm font-medium">
                  <Trans
                    message=":count profiles"
                    values={{count: items.length}}
                  />
                </p>
                <p className="text-xs text-muted-foreground">
                  <Trans message="Select a profile to edit it" />
                </p>
              </div>
              <Item.Group>
                {items.map(biolink => (
                  <BiolinkCard
                    key={biolink.id}
                    biolink={biolink}
                    onClick={() =>
                      navigate(`/${routeType}/biolinks/${biolink.id}`)
                    }
                    onInsights={() =>
                      navigate(`/${routeType}/biolinks/${biolink.id}/insights`)
                    }
                  />
                ))}
              </Item.Group>
            </div>
          )}
          <BackendPagination
            response={query.data}
            onPageChange={page => setQueryState({page})}
          />
          {items.length === 0 && <EmptyState />}
        </DashboardLayout.SectionScrollContainer>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function EmptyState() {
  return (
    <Empty.Root className="mx-auto min-h-96 max-w-2xl rounded-card border border-dashed">
      <Empty.Header className="max-w-md">
        <Empty.Media variant="icon">
          <LayoutPanelTop />
        </Empty.Media>
        <Empty.Title>
          <Trans message="No link in bio yet" />
        </Empty.Title>
        <Empty.Description>
          <Trans message="This workspace has no link in bio yet. Create one to get started." />
        </Empty.Description>
      </Empty.Header>
      <Empty.Content>
        <CreateBiolinkDialog>
          <Dialog.Trigger render={<Button variant="default" color="primary" />}>
            <PlusIcon data-icon="inline-start" />
            <Trans message="Create link in bio" />
          </Dialog.Trigger>
        </CreateBiolinkDialog>
      </Empty.Content>
    </Empty.Root>
  );
}

type BiolinkCardProps = {
  biolink: Biolink;
  onClick: () => void;
  onInsights: () => void;
};

function BiolinkCard({biolink, onClick, onInsights}: BiolinkCardProps) {
  return (
    <Item.Root
      variant="outline"
      size="sm"
      role="button"
      tabIndex={0}
      className="cursor-pointer bg-card transition-[border-color,background-color,box-shadow] hover:border-foreground/20 hover:bg-muted/30 hover:shadow-sm"
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      onClick={ignoreEventsFromPortal(e => {
        if (
          !(e.target as HTMLElement).closest(
            'a, button, input, [role="checkbox"]',
          )
        ) {
          onClick();
        }
      })}
    >
      <Item.Media
        align="center"
        className="size-10 rounded-card-sm border bg-muted/40 text-muted-foreground"
      >
        <LayoutPanelTop />
      </Item.Media>
      <Item.Content className="gap-0">
        <Item.Row>
          <Item.Title className="font-semibold">{biolink.name}</Item.Title>
        </Item.Row>
        <Item.Row>
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <span className="block truncate">
              {removeProtocol(biolink.short_url)}
            </span>
          </div>
        </Item.Row>
      </Item.Content>
      <Item.Actions className="basis-full justify-between gap-3 border-t pt-2.5 sm:ml-6 sm:basis-auto sm:justify-end sm:border-0 sm:pt-0">
        <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
          <MousePointerClick />
          <FormattedNumber value={biolink.clicks_count ?? 0} />
          <Trans message="clicks" />
        </span>
        <span className="flex items-center gap-1.5 text-xs whitespace-nowrap text-muted-foreground">
          <Clock3Icon />
          <FormattedRelativeTime date={biolink.created_at} style="narrow" />
        </span>
        <Dropdown.Root>
          <Dropdown.Trigger
            render={<Button variant="outline" size="icon-sm" />}
            aria-label="Profile actions"
          >
            <EllipsisVerticalIcon />
          </Dropdown.Trigger>
          <Dropdown.Content align="end">
            <Dropdown.Item onClick={onClick}>
              <PencilIcon />
              <Trans message="Edit" />
            </Dropdown.Item>
            <Dropdown.Item onClick={onInsights}>
              <BarChart3Icon />
              <Trans message="Insights" />
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>
      </Item.Actions>
    </Item.Root>
  );
}

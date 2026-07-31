import {CreateBiolinkDialog} from '@app/dashboard/biolink/biolink-editor/create-biolink-dialog';
import {listBiolinksOptions} from '@app/dashboard/biolink/biolinks-queries';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {Biolink} from '@app/gen/schemas/biolink';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
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
import {LayoutPanelTop, MousePointerClick, PlusIcon} from 'lucide-react';
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
        <DashboardLayout.SectionTitle>
          <Trans message="Link in bio" />
        </DashboardLayout.SectionTitle>
        <CreateBiolinkDialog>
          <Dialog.Trigger render={<Button variant="default" color="primary" />}>
            <PlusIcon />
            <Trans message="New" />
          </Dialog.Trigger>
        </CreateBiolinkDialog>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent>
        <DashboardLayout.SectionScrollContainer className="mx-0 flex flex-col gap-4 px-0">
          {items.map(biolink => (
            <BiolinkCard
              key={biolink.id}
              biolink={biolink}
              onClick={() => navigate(`/${routeType}/biolinks/${biolink.id}`)}
            />
          ))}
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
    <Empty.Root>
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
            <PlusIcon />
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
};

function BiolinkCard({biolink, onClick}: BiolinkCardProps) {
  return (
    <Item.Root
      variant="outline"
      className="bg-card transition-shadow hover:shadow-sm"
      onClick={ignoreEventsFromPortal(e => {
        if (
          !(e.target as HTMLElement).closest('a, button, input, [role="checkbox"]')
        ) {
          onClick();
        }
      })}
    >
      <Item.Media align="center" className="size-9.5 rounded-full border p-2">
        <LayoutPanelTop className="size-5" />
      </Item.Media>
      <Item.Content className="gap-0">
        <Item.Row>
          <Item.Title className="font-semibold">
            {biolink.name}
          </Item.Title>
        </Item.Row>
        <Item.Row>
          <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
            <span className="block truncate">
              {removeProtocol(biolink.short_url)}
            </span>
          </div>
        </Item.Row>
      </Item.Content>
      <Item.Actions className="gap-2">
        <Button
          variant="outline"
          size="xs"
          className="text-[13px]"
          onClick={e => {
            e.stopPropagation();
            onClick();
          }}
        >
          <MousePointerClick />
          <FormattedNumber value={biolink.clicks_count ?? 0} />
        </Button>
        <span className="whitespace-nowrap text-xs text-muted-foreground">
          <FormattedRelativeTime date={biolink.created_at} style="narrow" />
        </span>
      </Item.Actions>
    </Item.Root>
  );
}

import {CreateBiolinkDialog} from '@app/dashboard/stores/store-editor/create-biolink-dialog';
import {listStoresOptions} from '@app/dashboard/stores/stores-queries';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {Biolink} from '@app/gen/schemas/biolink';
import {Store} from '@app/gen/schemas/store';
type StoreBiolink = Biolink | Store;
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Avatar} from '@shadcn/avatar/avatar';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Empty} from '@shadcn/empty/empty';
import {Item} from '@shadcn/item/item';
import {BackendPagination} from '@shadcn/table/utils/table-pagination';
import {useTableQueryState} from '@shadcn/table/utils/use-table-query-state';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {useSuspenseQuery} from '@tanstack/react-query';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {Trans} from '@ui/i18n/trans';
import useClipboard from '@ui/utils/hooks/use-clipboard';
import {toast} from '@shadcn/toast/toast';
import {normalizeMediaUrl} from '@common/uploads/normalize-media-url';
import {removeProtocol} from '@ui/utils/urls/remove-protocol';
import {
  BarChart3Icon,
  CheckIcon,
  CopyIcon,
  EllipsisVerticalIcon,
  ExternalLinkIcon,
  InfoIcon,
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
  const query = useSuspenseQuery(listStoresOptions(routeType, queryState as any));
  const items = query.data?.data ?? [];

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Link in bio" />
          <Tooltip.Root>
            <Tooltip.Trigger
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6 text-muted-foreground"
                  aria-label="Manage your public creator profiles."
                />
              }
            >
              <InfoIcon className="size-4" />
            </Tooltip.Trigger>
            <Tooltip.Content>
              <Trans message="Manage your public creator profiles." />
            </Tooltip.Content>
          </Tooltip.Root>
        </DashboardLayout.SectionTitle>
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
                  {items.length === 1 ? (
                    <Trans message=":count profile" values={{count: items.length}} />
                  ) : (
                    <Trans message=":count profiles" values={{count: items.length}} />
                  )}
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
                      navigate(`/${routeType}/stores/${biolink.id}`)
                    }
                    onInsights={() =>
                      navigate(`/${routeType}/stores/${biolink.id}/insights`)
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
  biolink: StoreBiolink;
  onClick: () => void;
  onInsights: () => void;
};

function BiolinkCard({biolink, onClick, onInsights}: BiolinkCardProps) {
  const [isCopied, copyToClipboard] = useClipboard(biolink.short_url);
  const avatarUrl = normalizeMediaUrl(
    biolink.profile_config?.avatar_url || biolink.user?.image || '',
  );

  const copyProfileLink = () => {
    copyToClipboard();
    toast.success(<Trans message="Copied to clipboard" />);
  };

  return (
    <Item.Root
      variant="outline"
      size="sm"
      role="listitem"
      className="relative cursor-pointer bg-card transition-[border-color,background-color] hover:border-foreground/20 hover:bg-muted/30"
    >
      {/* One accessible edit target covers the card without nesting interactive controls. */}
      <button
        type="button"
        onClick={onClick}
        className="absolute inset-0 z-0 rounded-card outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <span className="sr-only">
          <Trans message="Edit profile" />: {biolink.name}
        </span>
      </button>

      <Item.Media
        align="center"
        className="size-10 overflow-hidden rounded-card-sm border bg-muted/40 text-muted-foreground"
      >
        <Avatar.Root className="size-full rounded-card-sm after:hidden">
          {avatarUrl && (
            <Avatar.Image
              src={avatarUrl}
              alt=""
              className="rounded-card-sm"
            />
          )}
          <Avatar.Fallback className="rounded-card-sm bg-transparent text-muted-foreground">
            <LayoutPanelTop className="size-5" aria-hidden="true" />
          </Avatar.Fallback>
        </Avatar.Root>
      </Item.Media>

      <Item.Content className="gap-0">
        <Item.Row>
          <Item.Title className="font-semibold">{biolink.name}</Item.Title>
        </Item.Row>
        <Item.Row>
          <span className="block min-w-0 truncate text-sm text-muted-foreground">
            {removeProtocol(biolink.short_url)}
          </span>
          <Tooltip.Root>
            <Tooltip.Trigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="relative z-10 size-7"
                  onClick={copyProfileLink}
                  aria-label={isCopied ? 'Link copied' : 'Copy profile link'}
                />
              }
            >
              {isCopied ? <CheckIcon /> : <CopyIcon />}
            </Tooltip.Trigger>
            <Tooltip.Content>
              {isCopied ? (
                <Trans message="Copied to clipboard" />
              ) : (
                <Trans message="Copy profile link" />
              )}
            </Tooltip.Content>
          </Tooltip.Root>
        </Item.Row>
      </Item.Content>

      <Item.Actions className="relative z-10 basis-full gap-2 border-t pt-2.5 sm:ms-6 sm:basis-auto sm:border-0 sm:pt-0">
        <Button
          variant="outline"
          color="default"
          size="xs"
          onClick={onInsights}
          className="me-auto gap-1.5 sm:me-2"
        >
          <MousePointerClick />
          <Trans
            message=":count clicks"
            values={{
              count: <FormattedNumber value={biolink.clicks_count ?? 0} />,
            }}
          />
        </Button>

        <Dropdown.Root>
          <Dropdown.Trigger
            render={<Button variant="ghost" size="icon-sm" />}
            aria-label="Profile actions"
          >
            <EllipsisVerticalIcon />
          </Dropdown.Trigger>
          <Dropdown.Content align="end">
            <Dropdown.Item onClick={onClick}>
              <PencilIcon />
              <Trans message="Edit profile" />
            </Dropdown.Item>
            <Dropdown.Item
              onClick={() =>
                window.open(biolink.short_url, '_blank', 'noopener,noreferrer')
              }
            >
              <ExternalLinkIcon />
              <Trans message="Open profile" />
            </Dropdown.Item>
            <Dropdown.Item onClick={copyProfileLink}>
              <CopyIcon />
              <Trans message="Copy link" />
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

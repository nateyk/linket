import {CreateBiolinkDialog} from '@app/dashboard/stores/store-editor/create-biolink-dialog';
import {listStoresOptions} from '@app/dashboard/stores/stores-queries';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {Biolink} from '@app/gen/schemas/biolink';
import {Store} from '@app/gen/schemas/store';
type StoreBiolink = Biolink | Store;
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {normalizeMediaUrl} from '@common/uploads/normalize-media-url';
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
import {message} from '@ui/i18n/message';
import {useTrans} from '@ui/i18n/use-trans';
import useClipboard from '@ui/utils/hooks/use-clipboard';
import {toast} from '@shadcn/toast/toast';
import {ignoreEventsFromPortal} from '@ui/utils/dom/ignore-events-from-portal';
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
import {useState} from 'react';
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

export function BiolinkCard({biolink, onClick, onInsights}: BiolinkCardProps) {
  const [isCopied, copyToClipboard] = useClipboard(biolink.short_url);
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const {trans} = useTrans();
  const avatarUrl = normalizeMediaUrl(biolink.profile_config?.avatar_url);
  const showAvatar = !!avatarUrl && failedAvatarUrl !== avatarUrl;
  const copyLabel = isCopied
    ? trans(message('Link copied'))
    : trans(message('Copy link'));

  const copyProfileLink = () => {
    copyToClipboard();
    toast.success(<Trans message="Copied to clipboard" />);
  };

  return (
    <Item.Root
      variant="outline"
      size="sm"
      role="listitem"
      className="cursor-pointer border-border bg-card text-card-foreground"
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
        className="size-10 overflow-hidden rounded-card-sm border bg-muted/40 text-muted-foreground"
      >
        {showAvatar ? (
          <img
            src={avatarUrl}
            alt=""
            loading="lazy"
            className="size-full object-cover"
            onError={() => setFailedAvatarUrl(avatarUrl)}
          />
        ) : (
          <LayoutPanelTop aria-hidden="true" />
        )}
      </Item.Media>
      <Item.Content className="gap-0">
        <Item.Row>
          <Item.Title>
            <button
              type="button"
              onClick={onClick}
              aria-label={trans(message('Edit :name', {values: {name: biolink.name}}))}
              className="block max-w-full truncate rounded-sm text-left font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {biolink.name}
            </button>
          </Item.Title>
        </Item.Row>
        <Item.Row>
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-muted-foreground">
            <span className="min-w-0 flex-1 truncate">
              {removeProtocol(biolink.short_url)}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label={copyLabel}
            title={copyLabel}
            onClick={copyProfileLink}
          >
            {isCopied ? (
              <CheckIcon aria-hidden="true" />
            ) : (
              <CopyIcon aria-hidden="true" />
            )}
          </Button>
        </Item.Row>
      </Item.Content>

      <Item.Actions className="w-full basis-full justify-between gap-2 sm:ms-auto sm:w-auto sm:basis-auto sm:justify-end md:ml-0">
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
          <MousePointerClick className="size-3.5 text-muted-foreground" aria-hidden="true" />
          <Trans
            message=":count clicks"
            values={{count: <FormattedNumber value={biolink.clicks_count ?? 0} />}}
          />
        </span>

        <Dropdown.Root>
          <Dropdown.Trigger
            render={<Button variant="ghost" size="icon-sm" />}
            aria-label={trans(message('Profile actions'))}
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

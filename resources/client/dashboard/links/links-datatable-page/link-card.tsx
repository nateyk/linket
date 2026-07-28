import {LinkImage} from '@app/dashboard/links/link-image';
import {LinkActionsButton} from '@app/dashboard/links/links-datatable-page/link-actions-button';
import {useLinksDataTableViewMode} from '@app/dashboard/links/links-datatable-page/links-datatable-view-mode-button';
import {ResourceCardUser} from '@app/dashboard/links/resource-card-user';
import {Link as LinkType} from '@app/gen/schemas/link';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {Button, LinkButton} from '@shadcn/button/button';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {Item} from '@shadcn/item/item';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {FormattedRelativeTime} from '@ui/i18n/formatted-relative-time';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {toast} from '@ui/toast/toast';
import {cn} from '@ui/utils/cn';
import {ignoreEventsFromPortal} from '@ui/utils/dom/ignore-events-from-portal';
import useClipboard from '@ui/utils/hooks/use-clipboard';
import {removeProtocol} from '@ui/utils/urls/remove-protocol';
import clsx from 'clsx';
import {
  CheckIcon,
  CopyIcon,
  CornerDownRightIcon,
  MousePointerClick,
  MoveRightIcon,
} from 'lucide-react';
import {use, useState} from 'react';
import {useNavigate} from 'react-router';

type Props = {
  link: LinkType;
  isSelected: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onRemoveFromFolder: () => void;
};
export function LinkCard({
  link,
  isSelected,
  onToggle,
  onDelete,
  onRemoveFromFolder,
}: Props) {
  const navigate = useNavigate();
  const [isCopied, copyToClipboard] = useClipboard(link.short_url);
  const [viewMode] = useLinksDataTableViewMode();

  return (
    <>
      <Item.Root
        variant={viewMode === 'cards' ? 'outline' : 'default'}
        size={viewMode === 'cards' ? 'default' : 'xs'}
        className={cn(
          viewMode === 'cards'
            ? 'bg-card transition-shadow hover:shadow-sm'
            : 'border-x-none rounded-none border-b-border transition-colors hover:bg-accent',
        )}
        onClick={ignoreEventsFromPortal(e => {
          if (
            !(e.target as HTMLElement).closest(
              'a, button, input, [role="checkbox"]',
            )
          ) {
            navigate(`${link.id}`);
          }
        })}
      >
        <LinkMedia link={link} isSelected={isSelected} onToggle={onToggle} />
        <Item.Content className="gap-0">
          <Item.Row>
            <Item.Title>
              <a
                href={link.short_url}
                target="_blank"
                rel="noreferrer"
                className="font-semibold hover:underline"
              >
                {removeProtocol(link.short_url)}
              </a>
            </Item.Title>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                copyToClipboard();
                toast.positive(message('Copied to clipboard'));
              }}
            >
              {isCopied ? <CheckIcon /> : <CopyIcon />}
            </Button>
            {viewMode === 'rows' ? <LinkDetails link={link} /> : null}
          </Item.Row>
          {viewMode === 'cards' && <LinkDetails link={link} />}
        </Item.Content>
        <Item.Actions>
          <ClicksButton link={link} />
          <LinkActionsButton
            size="icon"
            link={link}
            onDelete={onDelete}
            onRemoveFromFolder={onRemoveFromFolder}
          />
        </Item.Actions>
      </Item.Root>
    </>
  );
}

type ClicksButtonProps = {
  link: LinkType;
};
function ClicksButton({link}: ClicksButtonProps) {
  const formattedCount = <FormattedNumber value={link.clicks_count ?? 0} />;
  const {isMobileMode} = use(DashboardLayoutContext);
  return (
    <LinkButton
      to={`${link.id}/insights`}
      variant="outline"
      color="default"
      size="xs"
      className="text-[13px]"
    >
      <MousePointerClick />
      {isMobileMode ? (
        formattedCount
      ) : (
        <Trans message=":count clicks" values={{count: formattedCount}} />
      )}
    </LinkButton>
  );
}

type LinkDetailsProps = {
  link: LinkType;
};
function LinkDetails({link}: LinkDetailsProps) {
  const [viewMode] = useLinksDataTableViewMode();
  const {isMobileMode} = use(DashboardLayoutContext);
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground [&_svg]:size-3 [&_svg]:shrink-0">
      {viewMode === 'cards' ? <CornerDownRightIcon /> : <MoveRightIcon />}
      <a
        href={link.long_url}
        target="_blank"
        rel="noreferrer"
        className="block truncate hover:underline"
      >
        {removeProtocol(link.long_url)}
      </a>
      {link.user && <ResourceCardUser className="mx-1" user={link.user} />}
      {!isMobileMode ? (
        <div className="shrink-0 whitespace-nowrap">
          <FormattedRelativeTime date={link.created_at} style="narrow" />
        </div>
      ) : null}
    </div>
  );
}

function LinkMedia({
  link,
  isSelected,
  onToggle,
}: {
  link: LinkType;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [viewMode] = useLinksDataTableViewMode();
  const checkboxVisible = isHovered || isSelected;
  return (
    <Item.Media
      align="center"
      className={cn(
        'size-9.5 rounded-full',
        viewMode === 'cards' && 'border p-2',
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={e => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <LinkImage
        link={link}
        size="size-5"
        className={clsx(checkboxVisible ? 'hidden' : 'block')}
      />
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle()}
        className={clsx(checkboxVisible ? 'block' : 'hidden')}
      />
    </Item.Media>
  );
}

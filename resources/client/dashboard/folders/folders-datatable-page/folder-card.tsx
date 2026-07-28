import {FolderImage} from '@app/dashboard/folders/folder-icons';
import {FolderActionsButton} from '@app/dashboard/folders/folders-datatable-page/folder-actions-button';
import {ResourceCardUser} from '@app/dashboard/links/resource-card-user';
import {Folder} from '@app/gen/schemas/folder';
import {Badge} from '@shadcn/badge/badge';
import {Button, LinkButton} from '@shadcn/button/button';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {FormattedNumber} from '@ui/i18n/formatted-number';
import {FormattedRelativeTime} from '@ui/i18n/formatted-relative-time';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {toast} from '@ui/toast/toast';
import {cn} from '@ui/utils/cn';
import {ignoreEventsFromPortal} from '@ui/utils/dom/ignore-events-from-portal';
import useClipboard from '@ui/utils/hooks/use-clipboard';
import {removeProtocol} from '@ui/utils/urls/remove-protocol';
import {
  CheckIcon,
  CopyIcon,
  CornerDownRightIcon,
  LinkIcon,
  MousePointerClick,
} from 'lucide-react';
import {useState} from 'react';
import {Link, useNavigate} from 'react-router';

type FolderCardProps = {
  folder: Folder;
  isSelected: boolean;
  onToggle: () => void;
  onDelete: () => void;
};
export function FolderCard({
  folder,
  isSelected,
  onToggle,
  onDelete,
}: FolderCardProps) {
  const navigate = useNavigate();
  const [isCopied, copyToClipboard] = useClipboard(folder.short_url);
  return (
    <div
      className="cursor-pointer rounded-card border bg-background p-4 transition-shadow hover:shadow-sm"
      onClick={ignoreEventsFromPortal(event => {
        if (
          !(event.target as HTMLElement).closest(
            'a, button, input, [role="checkbox"]',
          )
        ) {
          navigate(`${folder.id}`);
        }
      })}
    >
      <div className="mb-4.5 flex items-start justify-between gap-3">
        <ImageSection
          folder={folder}
          isSelected={isSelected}
          onToggle={onToggle}
        />
        <FolderActionsButton
          size="icon-sm"
          folder={folder}
          onDelete={onDelete}
        />
      </div>
      <div className="mb-0.5 flex items-center gap-2">
        <Link
          className="truncate text-base font-semibold hover:underline"
          to={`${folder.id}`}
        >
          {folder.name}
        </Link>
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
        {folder.rotator ? (
          <Badge variant="secondary">
            <Trans message="Rotator" />
          </Badge>
        ) : null}
      </div>
      <FolderDetails folder={folder} />
      <div className="mt-6 flex items-center gap-1.5 text-sm [&_svg]:size-3 [&_svg]:shrink-0">
        <LinkIcon />
        {folder.links_count ? (
          <Trans
            message=":count links"
            values={{
              count: <FormattedNumber value={folder.links_count} />,
            }}
          />
        ) : (
          <Trans message="No links" />
        )}
        <ClicksButton folder={folder} className="ml-auto" />
      </div>
    </div>
  );
}

type ImageSectionProps = {
  folder: Folder;
  isSelected: boolean;
  onToggle: () => void;
};
function ImageSection({folder, isSelected, onToggle}: ImageSectionProps) {
  const [isHovered, setIsHovered] = useState(false);
  const checkboxVisible = isHovered || isSelected;
  return (
    <div
      className="flex size-10 items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <FolderImage
        src={folder.image ?? 'folders'}
        className={cn(
          'max-h-full max-w-full rounded-sm',
          checkboxVisible ? 'hidden' : 'block',
        )}
      />
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle()}
        className={cn(checkboxVisible ? 'block' : 'hidden')}
      />
    </div>
  );
}

type ClicksButtonProps = {
  folder: Folder;
  className?: string;
};
function ClicksButton({folder, className}: ClicksButtonProps) {
  const formattedCount = <FormattedNumber value={folder.clicks_count ?? 0} />;
  return (
    <LinkButton
      to={`${folder.id}/insights`}
      variant="outline"
      color="default"
      size="xs"
      className={className}
    >
      <MousePointerClick />
      <Trans message=":count clicks" values={{count: formattedCount}} />
    </LinkButton>
  );
}

type FolderDetailsProps = {
  folder: Folder;
};
function FolderDetails({folder}: FolderDetailsProps) {
  return (
    <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground [&_svg]:size-3 [&_svg]:shrink-0">
      <CornerDownRightIcon />
      <a
        href={folder.short_url}
        target="_blank"
        rel="noreferrer"
        className="block truncate hover:underline"
      >
        {removeProtocol(folder.short_url)}
      </a>
      {folder.user && <ResourceCardUser className="mx-1" user={folder.user} />}
      <div className="shrink-0 whitespace-nowrap">
        <FormattedRelativeTime date={folder.created_at} style="narrow" />
      </div>
    </div>
  );
}

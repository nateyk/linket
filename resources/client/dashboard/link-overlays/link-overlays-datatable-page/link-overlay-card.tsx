import {DeleteLinkOverlaysDialog} from '@app/dashboard/link-overlays/link-overlays-datatable-page/delete-link-overlays-dialog';
import {
  archiveLinkOverlaysOptions,
  unarchiveLinkOverlaysOptions,
} from '@app/dashboard/link-overlays/link-overlays-queries';
import {ResourceCardUser} from '@app/dashboard/links/resource-card-user';
import {useUsage} from '@app/dashboard/use-usage';
import {LinkOverlay} from '@app/gen/schemas/link-overlay';
import {useAuth} from '@common/auth/use-auth';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {Item} from '@shadcn/item/item';
import {useMutation} from '@tanstack/react-query';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {toast} from '@ui/toast/toast';
import clsx from 'clsx';
import {
  ArchiveIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  PictureInPicture2,
  Trash,
} from 'lucide-react';
import {use, useState} from 'react';
import {Link, useNavigate} from 'react-router';

type LinkOverlayCardProps = {
  linkOverlay: LinkOverlay;
  isSelected: boolean;
  onToggle: () => void;
};

export function LinkOverlayCard({
  linkOverlay,
  isSelected,
  onToggle,
}: LinkOverlayCardProps) {
  const navigate = useNavigate();

  return (
    <Item.Root
      variant="outline"
      className="cursor-pointer transition-shadow hover:shadow-sm"
      onClick={e => {
        if (!(e.target as HTMLElement).closest('button, input, a')) {
          navigate(`${linkOverlay.id}`);
        }
      }}
    >
      <LinkOverlayMedia isSelected={isSelected} onToggle={onToggle} />
      <Item.Content>
        <Item.Title>{linkOverlay.name}</Item.Title>
        <Item.Description>{linkOverlay.message}</Item.Description>
        <Item.Row className="gap-3">
          <div className="text-muted-foreground">
            <FormattedDate date={linkOverlay.created_at} />
          </div>
          {linkOverlay.user && <ResourceCardUser user={linkOverlay.user} />}
        </Item.Row>
      </Item.Content>
      <Item.Actions>
        <LinkOverlayOptionsButton linkOverlay={linkOverlay} />
      </Item.Actions>
    </Item.Root>
  );
}

type LinkOverlayMediaProps = {
  isSelected: boolean;
  onToggle: () => void;
};

function LinkOverlayMedia({isSelected, onToggle}: LinkOverlayMediaProps) {
  const {isMobileMode} = use(DashboardLayoutContext);
  const [isHovered, setIsHovered] = useState(false);
  const isCheckboxVisible = isSelected || (!isMobileMode && isHovered);

  return (
    <Item.Media
      align="center"
      className="size-9.5 rounded-full border"
      onMouseEnter={isMobileMode ? undefined : () => setIsHovered(true)}
      onMouseLeave={isMobileMode ? undefined : () => setIsHovered(false)}
      onClick={e => {
        e.stopPropagation();
        onToggle();
      }}
    >
      <PictureInPicture2
        className={clsx('size-4', isCheckboxVisible ? 'hidden' : 'block')}
      />
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle()}
        className={clsx(isCheckboxVisible ? 'block' : 'hidden')}
      />
    </Item.Media>
  );
}

type LinkOverlayOptionsButtonProps = {
  linkOverlay: LinkOverlay;
};

function LinkOverlayOptionsButton({
  linkOverlay,
}: LinkOverlayOptionsButtonProps) {
  const query = useUsage();
  const {user} = useAuth();
  const archiveLinkOverlays = useMutation(archiveLinkOverlaysOptions());
  const unarchiveLinkOverlays = useMutation(unarchiveLinkOverlaysOptions());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const canDeleteLinkOverlay =
    query.data?.data.link_overlays.delete || linkOverlay.user_id === user?.id;
  const canEditLinkOverlay =
    query.data?.data.link_overlays.update || linkOverlay.user_id === user?.id;

  const handleArchive = () => {
    archiveLinkOverlays.mutate([linkOverlay.id], {
      onSuccess: () => {
        toast.positive(message('Link overlay archived'));
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  const handleUnarchive = () => {
    unarchiveLinkOverlays.mutate([linkOverlay.id], {
      onSuccess: () => {
        toast.positive(message('Link overlay unarchived'));
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <>
      <Dropdown.Root>
        <Dropdown.Trigger render={<Button variant="ghost" size="icon-sm" />}>
          <EllipsisVerticalIcon />
        </Dropdown.Trigger>
        <Dropdown.Content align="end">
          {canEditLinkOverlay && (
            <Dropdown.LinkItem render={<Link to={`${linkOverlay.id}`} />}>
              <PencilIcon />
              <Trans message="Edit" />
            </Dropdown.LinkItem>
          )}
          <Dropdown.Item
            disabled={!canDeleteLinkOverlay}
            onClick={() =>
              linkOverlay.deleted_at ? handleUnarchive() : handleArchive()
            }
          >
            <ArchiveIcon />
            {!linkOverlay.deleted_at ? (
              <Trans message="Archive" />
            ) : (
              <Trans message="Unarchive" />
            )}
          </Dropdown.Item>
          <Dropdown.Separator />
          <Dropdown.Item
            variant="destructive"
            disabled={!canDeleteLinkOverlay}
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash />
            <Trans message="Delete" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
      <DeleteLinkOverlaysDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        ids={[linkOverlay.id]}
      />
    </>
  );
}

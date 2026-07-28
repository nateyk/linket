import {ResourceCardUser} from '@app/dashboard/links/resource-card-user';
import {UpdatePixelDialog} from '@app/dashboard/tracking-pixels/crupdate-dialog/update-pixel-dialog';
import {SupportedTrackingPixels} from '@app/dashboard/tracking-pixels/supported-tracking-pixels';
import {DeleteTrackingPixelsDialog} from '@app/dashboard/tracking-pixels/tracking-pixels-datatable-page/delete-tracking-pixels-dialog';
import {
  archiveTrackingPixelsOptions,
  unarchiveTrackingPixelsOptions,
} from '@app/dashboard/tracking-pixels/tracking-pixels-queries';
import {useUsage} from '@app/dashboard/use-usage';
import {TrackingPixel} from '@app/gen/schemas/tracking-pixel';
import {useAuth} from '@common/auth/use-auth';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {DashboardLayoutContext} from '@common/ui/dashboard/dashboard-layout-context';
import {RemoteFavicon} from '@common/ui/other/remote-favicon';
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
  MousePointerClick,
  PencilIcon,
  Trash,
} from 'lucide-react';
import {use, useState} from 'react';

type TrackingPixelCardProps = {
  trackingPixel: TrackingPixel;
  isSelected: boolean;
  onToggle: () => void;
};

export function TrackingPixelCard({
  trackingPixel,
  isSelected,
  onToggle,
}: TrackingPixelCardProps) {
  const docsUrl = SupportedTrackingPixels.find(
    pixel => pixel.name === trackingPixel.type,
  )?.docsUrl;

  return (
    <Item.Root variant="outline">
      <TrackingPixelMedia
        docsUrl={docsUrl}
        isSelected={isSelected}
        onToggle={onToggle}
      />
      <Item.Content>
        <Item.Title>{trackingPixel.name}</Item.Title>
        <Item.Row className="gap-3">
          <div className="text-muted-foreground">
            <FormattedDate date={trackingPixel.created_at} />
          </div>
          {trackingPixel.user && <ResourceCardUser user={trackingPixel.user} />}
        </Item.Row>
      </Item.Content>
      <Item.Actions>
        <TrackingPixelOptionsButton trackingPixel={trackingPixel} />
      </Item.Actions>
    </Item.Root>
  );
}

type TrackingPixelMediaProps = {
  docsUrl?: string;
  isSelected: boolean;
  onToggle: () => void;
};

function TrackingPixelMedia({
  docsUrl,
  isSelected,
  onToggle,
}: TrackingPixelMediaProps) {
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
      {docsUrl ? (
        <RemoteFavicon
          url={docsUrl}
          size="size-4.5"
          className={clsx(isCheckboxVisible ? 'hidden' : 'block')}
        />
      ) : (
        <MousePointerClick
          className={clsx('size-4', isCheckboxVisible ? 'hidden' : 'block')}
        />
      )}
      <Checkbox
        checked={isSelected}
        onCheckedChange={() => onToggle()}
        className={clsx(isCheckboxVisible ? 'block' : 'hidden')}
      />
    </Item.Media>
  );
}

type TrackingPixelOptionsButtonProps = {
  trackingPixel: TrackingPixel;
};

function TrackingPixelOptionsButton({
  trackingPixel,
}: TrackingPixelOptionsButtonProps) {
  const query = useUsage();
  const {user} = useAuth();
  const archiveTrackingPixels = useMutation(archiveTrackingPixelsOptions());
  const unarchiveTrackingPixels = useMutation(unarchiveTrackingPixelsOptions());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const canDeletePixel =
    query.data?.data.tracking_pixels.delete ||
    trackingPixel.user_id === user?.id;
  const canEditPixel =
    query.data?.data.tracking_pixels.update ||
    trackingPixel.user_id === user?.id;

  const handleArchive = () => {
    archiveTrackingPixels.mutate([trackingPixel.id], {
      onSuccess: () => {
        toast.positive(message('Tracking pixel archived'));
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  const handleUnarchive = () => {
    unarchiveTrackingPixels.mutate([trackingPixel.id], {
      onSuccess: () => {
        toast.positive(message('Tracking pixel unarchived'));
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
          <Dropdown.Item
            disabled={!canEditPixel}
            onClick={() => setEditDialogOpen(true)}
          >
            <PencilIcon />
            <Trans message="Edit" />
          </Dropdown.Item>
          <Dropdown.Item
            disabled={!canDeletePixel}
            onClick={() =>
              trackingPixel.deleted_at ? handleUnarchive() : handleArchive()
            }
          >
            <ArchiveIcon />
            {!trackingPixel.deleted_at ? (
              <Trans message="Archive" />
            ) : (
              <Trans message="Unarchive" />
            )}
          </Dropdown.Item>
          <Dropdown.Separator />
          <Dropdown.Item
            variant="destructive"
            disabled={!canDeletePixel}
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash />
            <Trans message="Delete" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
      <UpdatePixelDialog
        pixel={trackingPixel}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
      <DeleteTrackingPixelsDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        ids={[trackingPixel.id]}
      />
    </>
  );
}

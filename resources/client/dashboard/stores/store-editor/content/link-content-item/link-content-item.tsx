import {useBiolinkEditorStore} from '@app/dashboard/stores/store-editor/biolink-editor-store';
import {BiolinkItemLayout} from '@app/dashboard/stores/store-editor/content/biolink-item-layout';
import {LeapLinkDialog} from '@app/dashboard/stores/store-editor/content/link-content-item/leap-link-dialog';
import {LinkAnimationDialog} from '@app/dashboard/stores/store-editor/content/link-content-item/link-animation-dialog';
import {LinkScheduleDialog} from '@app/dashboard/stores/store-editor/content/link-content-item/link-schedule-dialog';
import {LinkThumbnailDialog} from '@app/dashboard/stores/store-editor/content/link-content-item/link-thumbnail-dialog';
import {UpdateBiolinkLinkDialog} from '@app/dashboard/stores/store-editor/content/links/update-biolink-link-dialog';
import {
  detachStoreLinkOptions,
  updateStoreLinkOptions,
} from '@app/dashboard/stores/stores-queries';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {BiolinkLink} from '@app/gen/schemas/biolink-link';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {RemoteFavicon} from '@common/ui/other/remote-favicon';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button, LinkButton} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Switch} from '@shadcn/forms/switch/switch';
import {Tooltip} from '@shadcn/tooltip/tooltip';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useIsMobileMediaQuery} from '@ui/utils/hooks/is-mobile-media-query';
import {useMediaQuery} from '@ui/utils/hooks/use-media-query';
import {removeProtocol} from '@ui/utils/urls/remove-protocol';
import {
  ChartColumnBigIcon,
  ClockPlusIcon,
  ImageIcon,
  MousePointerClickIcon,
  PencilIcon,
  Redo2Icon,
  SendToBackIcon,
  XIcon,
} from 'lucide-react';
import {useState} from 'react';

export function LinkContentItem({item: link}: {item: BiolinkLink}) {
  return (
    <BiolinkItemLayout.Root item={link}>
      <div className="flex items-center">
        <BiolinkItemLayout.Title>{link.name}</BiolinkItemLayout.Title>
        <UpdateBiolinkLinkDialog link={link}>
          <Dialog.Trigger className="ml-5" render={<Button variant="ghost" />}>
            <PencilIcon />
            <Trans message="Edit" />
          </Dialog.Trigger>
        </UpdateBiolinkLinkDialog>
        <DetachDialog link={link} />
      </div>
      <div className="mb-5 flex items-center gap-1.5">
        <RemoteFavicon url={link.long_url} />
        <a
          href={link.short_url}
          target="_blank"
          className="overflow-hidden text-sm text-ellipsis whitespace-nowrap text-muted-foreground hover:underline"
          rel="noreferrer"
        >
          {removeProtocol(link.long_url)}
        </a>
      </div>
      <ActionRow link={link} />
    </BiolinkItemLayout.Root>
  );
}

interface ActionRowProps {
  link: BiolinkLink;
}
function ActionRow({link}: ActionRowProps) {
  const {storeId} = useRequiredParams(['storeId']);
  const overrideContent = useBiolinkEditorStore(s => s.overrideContent);
  const updateLink = useMutation({
    ...updateStoreLinkOptions(Number(storeId), link.id),
    onSuccess: response => {
      overrideContent(response.data.content);
    },
    onError: err => showHttpErrorToast(err),
  });

  return (
    <div className="flex h-10.5 items-center md:justify-between md:gap-6">
      <div className="flex items-center gap-1">
        <Switch
          className="mr-2"
          checked={!!link.active}
          disabled={link.active_locked || updateLink.isPending}
          onCheckedChange={() => {
            updateLink.mutate({
              active: !link.active,
            });
          }}
        />

        <LinkThumbnailDialog link={link}>
          <Tooltip.Root>
            <Tooltip.Trigger
              render={
                <Dialog.Trigger
                  render={
                    <Button
                      variant="ghost"
                      color={link.image ? 'primary' : null}
                      size="icon-sm"
                    >
                      <ImageIcon />
                    </Button>
                  }
                />
              }
            />
            <Tooltip.Content>
              <Trans message="Change thumbnail" />
            </Tooltip.Content>
          </Tooltip.Root>
        </LinkThumbnailDialog>

        <LinkAnimationDialog link={link}>
          <Tooltip.Root>
            <Tooltip.Trigger
              render={
                <Dialog.Trigger
                  render={
                    <Button
                      variant="ghost"
                      color={link.animation ? 'primary' : null}
                      size="icon-sm"
                    >
                      <SendToBackIcon />
                    </Button>
                  }
                />
              }
            />
            <Tooltip.Content>
              <Trans message="Animation" />
            </Tooltip.Content>
          </Tooltip.Root>
        </LinkAnimationDialog>

        <LeapLinkDialog link={link}>
          <Tooltip.Root>
            <Tooltip.Trigger
              render={
                <Dialog.Trigger
                  render={
                    <Button
                      variant="ghost"
                      color={link.leap_until ? 'primary' : null}
                      size="icon-sm"
                    >
                      <Redo2Icon />
                    </Button>
                  }
                />
              }
            />
            <Tooltip.Content>
              <Trans message="Redirect" />
            </Tooltip.Content>
          </Tooltip.Root>
        </LeapLinkDialog>

        <LinkScheduleDialog link={link}>
          <Tooltip.Root>
            <Tooltip.Trigger
              render={
                <Dialog.Trigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      color={
                        link.expires_at || link.activates_at ? 'primary' : null
                      }
                    >
                      <ClockPlusIcon />
                    </Button>
                  }
                />
              }
            />
            <Tooltip.Content>
              <Trans message="Schedule" />
            </Tooltip.Content>
          </Tooltip.Root>
        </LinkScheduleDialog>
      </div>
      <ClicksButton link={link} />
    </div>
  );
}

interface ClicksButtonProps {
  link: BiolinkLink;
}
function ClicksButton({link}: ClicksButtonProps) {
  const {routeType} = useDatatableRouteType();
  const isMobile = useIsMobileMediaQuery();
  const isVerySmallScreen = useMediaQuery('(max-width: 380px)');
  if (isVerySmallScreen) {
    return null;
  }

  const clicksReportPath = `/${routeType}/links/${link.id}/insights`;

  const button = isMobile ? (
    <LinkButton variant="ghost" to={clicksReportPath} target="_blank">
      <MousePointerClickIcon />
    </LinkButton>
  ) : (
    <LinkButton variant="ghost" size="xs" to={clicksReportPath} target="_blank">
      <ChartColumnBigIcon />
      <Trans message=":count clicks" values={{count: link.clicks_count}} />
    </LinkButton>
  );

  return (
    <Tooltip.Root>
      <Tooltip.Trigger render={button} />
      <Tooltip.Content>
        <Trans
          message=":count lifetime clicks"
          values={{count: link.clicks_count}}
        />
      </Tooltip.Content>
    </Tooltip.Root>
  );
}

function DetachDialog({link}: {link: BiolinkLink}) {
  const {storeId} = useRequiredParams(['storeId']);
  const overrideContent = useBiolinkEditorStore(s => s.overrideContent);

  const [open, setOpen] = useState(false);
  const detachLink = useMutation({
    ...detachStoreLinkOptions(Number(storeId), link.id),
    onSuccess: response => {
      overrideContent(response.data.content);
    },
    onError: err => showHttpErrorToast(err),
  });
  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger
        render={
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={detachLink.isPending}
          />
        }
      >
        <XIcon />
      </AlertDialog.Trigger>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Title>
              <Trans message="Detach link" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="Are you sure you want to detach this link?" />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={detachLink.isPending}
              onClick={() => detachLink.mutate()}
            >
              <Trans message="Detach" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

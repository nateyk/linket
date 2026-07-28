import {DetachLinksDialog} from '@app/dashboard/folders/folder-links-datatable-page/detach-links-dialog';
import {DeleteLinksDialog} from '@app/dashboard/links/links-datatable-page/delete-links-dialog';
import {batchUpdateLinksOptions} from '@app/dashboard/links/links-queries';
import {UpdateQrCodeStyleDialog} from '@app/dashboard/qr-codes/style-dialog/update-qr-code-style-dialog';
import {usePolicyCheckResult} from '@app/dashboard/upgrade/permission-aware-button';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {Link as LinkType} from '@app/gen/schemas/link';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import useClipboard from '@ui/utils/hooks/use-clipboard';
import {
  ArchiveIcon,
  ChartColumnBigIcon,
  Copy,
  Edit,
  FolderInput,
  FolderXIcon,
  MoreVerticalIcon,
  QrCode,
  Trash,
} from 'lucide-react';
import {ComponentProps, useState} from 'react';
import {Link, useParams} from 'react-router';

type Props = {
  variant?: ComponentProps<typeof Button>['variant'];
  size?: ComponentProps<typeof Button>['size'];
  link: LinkType;
  onDelete?: () => void;
  onRemoveFromFolder?: () => void;
  hideEditAction?: boolean;
};
export function LinkActionsButton({
  link,
  variant = 'ghost',
  size = 'icon',
  onDelete,
  onRemoveFromFolder,
  hideEditAction = false,
}: Props) {
  const {allowed: canDelete} = usePolicyCheckResult(link, 'delete');
  const {allowed: canUpdate} = usePolicyCheckResult(link, 'update');
  const batchUpdateLinks = useMutation(batchUpdateLinksOptions());

  const {folderId} = useParams();
  const [, copyToClipboard] = useClipboard(link.short_url);
  const [detachDialogOpen, setDetachDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [qrCodeStyleDialogOpen, setQrCodeStyleDialogOpen] = useState(false);

  const handleCopyToClipboard = () => {
    copyToClipboard();
    toast.success(<Trans message="Copied to clipboard" />);
  };

  const handleArchive = () => {
    batchUpdateLinks.mutate(
      {ids: [link.id], archive: true},
      {
        onSuccess: () => {
          toast.success(<Trans message="Link archived" />);
        },
        onError: err => showHttpErrorToast(err),
      },
    );
  };

  const handleUnarchive = () => {
    batchUpdateLinks.mutate(
      {ids: [link.id], unarchive: true},
      {
        onSuccess: () => {
          toast.success(<Trans message="Link unarchived" />);
        },
        onError: err => showHttpErrorToast(err),
      },
    );
  };

  const detachDialog = (
    <DetachLinksDialog
      open={detachDialogOpen}
      onOpenChange={setDetachDialogOpen}
      linkIds={[link.id]}
      onDetach={() => {
        setDetachDialogOpen(false);
        onRemoveFromFolder?.();
      }}
    />
  );

  const deleteDialog = (
    <DeleteLinksDialog
      open={deleteDialogOpen}
      onOpenChange={setDeleteDialogOpen}
      linkIds={[link.id]}
      onDelete={() => {
        setDeleteDialogOpen(false);
        onDelete?.();
      }}
    />
  );

  return (
    <>
      {detachDialog}
      {deleteDialog}
      {!!link.qr_code?.id && qrCodeStyleDialogOpen && (
        <UpdateQrCodeStyleDialog
          open
          onOpenChange={setQrCodeStyleDialogOpen}
          id={link.qr_code.id}
          url={link.short_url}
          style={link.qr_code.style}
        />
      )}
      <Dropdown.Root>
        <Dropdown.Trigger render={<Button size={size} variant={variant} />}>
          <MoreVerticalIcon />
        </Dropdown.Trigger>
        <Dropdown.Content>
          {!hideEditAction && canUpdate && (
            <Dropdown.LinkItem render={<Link to={`${link.id}`} />}>
              <Edit />
              <Trans message="Edit" />
            </Dropdown.LinkItem>
          )}
          {!hideEditAction && (
            <Dropdown.LinkItem render={<Link to={`${link.id}/insights`} />}>
              <ChartColumnBigIcon />
              <Trans message="View insights" />
            </Dropdown.LinkItem>
          )}
          {!!link.qr_code && canUpdate && (
            <Dropdown.Item onClick={() => setQrCodeStyleDialogOpen(true)}>
              <QrCode />
              <Trans message="Customize QR code" />
            </Dropdown.Item>
          )}
          <Dropdown.Item onClick={() => handleCopyToClipboard()}>
            <Copy />
            <Trans message="Copy short link" />
          </Dropdown.Item>
          {canUpdate && (
            <Dropdown.Item>
              <FolderInput />
              <Trans message="Move to folder" />
            </Dropdown.Item>
          )}
          {folderId && canUpdate ? (
            <Dropdown.Item onClick={() => setDetachDialogOpen(true)}>
              <FolderXIcon />
              <Trans message="Remove from folder" />
            </Dropdown.Item>
          ) : null}
          {canUpdate && (
            <Dropdown.Item
              onClick={() =>
                link.deleted_at ? handleUnarchive() : handleArchive()
              }
            >
              <ArchiveIcon />
              {!link.deleted_at ? (
                <Trans message="Archive" />
              ) : (
                <Trans message="Unarchive" />
              )}
            </Dropdown.Item>
          )}
          {canDelete && (
            <>
              <Dropdown.Separator />
              <Dropdown.Item
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash />
                <Trans message="Delete" />
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Content>
      </Dropdown.Root>
    </>
  );
}

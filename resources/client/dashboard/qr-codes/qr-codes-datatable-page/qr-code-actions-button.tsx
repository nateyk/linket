import {buildQrCodeUrl} from '@app/dashboard/qr-codes/build-qr-code-url';
import {downloadQrCode} from '@app/dashboard/qr-codes/qr-code-renderer';
import {DeleteQrCodesDialog} from '@app/dashboard/qr-codes/qr-codes-datatable-page/delete-qr-codes-dialog';
import {
  archiveQrCodesOptions,
  unarchiveQrCodesOptions,
} from '@app/dashboard/qr-codes/qr-codes-queries';
import {UpdateQrCodeStyleDialog} from '@app/dashboard/qr-codes/style-dialog/update-qr-code-style-dialog';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {QrCode} from '@app/gen/schemas/qr-code';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {
  ArchiveIcon,
  ChartBarIcon,
  DownloadIcon,
  Edit,
  MoreVerticalIcon,
  PaintbrushIcon,
  Trash,
} from 'lucide-react';
import {ComponentProps, useState} from 'react';
import {Link} from 'react-router';

type QrCodeActionsButtonProps = {
  qrCode: QrCode;
  variant?: ComponentProps<typeof Button>['variant'];
  size?: ComponentProps<typeof Button>['size'];
  onDelete?: () => void;
  hideDetailsItems?: boolean;
};

export function QrCodeActionsButton({
  qrCode,
  variant = 'ghost',
  size = 'icon',
  onDelete,
  hideDetailsItems = false,
}: QrCodeActionsButtonProps) {
  const archiveQrCodes = useMutation(archiveQrCodesOptions());
  const unarchiveQrCodes = useMutation(unarchiveQrCodesOptions());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [styleDialogOpen, setStyleDialogOpen] = useState(false);

  const handleArchive = () => {
    archiveQrCodes.mutate([qrCode.id], {
      onSuccess: () => {
        toast.success(<Trans message="QR code archived" />);
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  const handleUnarchive = () => {
    unarchiveQrCodes.mutate([qrCode.id], {
      onSuccess: () => {
        toast.success(<Trans message="QR code unarchived" />);
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <>
      <Dropdown.Root>
        <Dropdown.Trigger render={<Button size={size} variant={variant} />}>
          <MoreVerticalIcon />
        </Dropdown.Trigger>
        <Dropdown.Content>
          {!hideDetailsItems && (
            <Dropdown.LinkItem render={<Link to={`${qrCode.id}`} />}>
              <Edit />
              <Trans message="Edit" />
            </Dropdown.LinkItem>
          )}
          {!hideDetailsItems && (
            <Dropdown.LinkItem render={<Link to={`${qrCode.id}/insights`} />}>
              <ChartBarIcon />
              <Trans message="View insights" />
            </Dropdown.LinkItem>
          )}
          <Dropdown.Item onClick={() => setStyleDialogOpen(true)}>
            <PaintbrushIcon />
            <Trans message="Customize style" />
          </Dropdown.Item>
          <Dropdown.Item
            onClick={() =>
              downloadQrCode({
                qrCode,
                extension: 'png',
              })
            }
          >
            <DownloadIcon />
            <Trans message="Download" />
          </Dropdown.Item>
          <Dropdown.Item
            onClick={() =>
              qrCode.deleted_at ? handleUnarchive() : handleArchive()
            }
          >
              <ArchiveIcon />
              {!qrCode.deleted_at ? (
                <Trans message="Archive" />
              ) : (
                <Trans message="Unarchive" />
            )}
          </Dropdown.Item>
          <Dropdown.Separator />
          <Dropdown.Item
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash />
            <Trans message="Delete" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>

      <UpdateQrCodeStyleDialog
        open={styleDialogOpen}
        onOpenChange={setStyleDialogOpen}
        id={qrCode.id}
        url={buildQrCodeUrl(qrCode)}
        style={qrCode.style}
      />
      <DeleteQrCodesDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        qrCodeIds={[qrCode.id]}
        onDelete={onDelete}
      />
    </>
  );
}

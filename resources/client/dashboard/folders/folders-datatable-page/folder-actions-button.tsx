import {DeleteFoldersDialog} from '@app/dashboard/folders/folders-datatable-page/delete-folders-dialog';
import {
  archiveFoldersOptions,
  unarchiveFoldersOptions,
} from '@app/dashboard/folders/folders-queries';
import {ShareLinkDialog} from '@app/dashboard/links/sharing/share-link-dialog';
import {useDatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {useUsage} from '@app/dashboard/use-usage';
import {Folder} from '@app/gen/schemas/folder';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {
  ArchiveIcon,
  ChartColumnBigIcon,
  LinkIcon,
  MoreVerticalIcon,
  PencilIcon,
  Share2Icon,
  Trash,
} from 'lucide-react';
import {ComponentProps, useState} from 'react';
import {Link} from 'react-router';

type Props = {
  folder: Folder;
  hideDetailsLinks?: boolean;
  onDelete?: () => void;
  onArchive?: () => void;
  variant?: ComponentProps<typeof Button>['variant'];
  color?: ComponentProps<typeof Button>['color'];
  size?: ComponentProps<typeof Button>['size'];
};
export function FolderActionsButton({
  folder,
  hideDetailsLinks = false,
  onDelete,
  onArchive,
  variant = 'ghost',
  color,
  size = 'icon',
}: Props) {
  const {routeType} = useDatatableRouteType();
  const {data} = useUsage();
  const canDeleteFolder = data?.data.folders.delete;
  const archiveFolders = useMutation(archiveFoldersOptions());
  const unarchiveFolders = useMutation(unarchiveFoldersOptions());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  if (!data?.data.folders.update) {
    hideDetailsLinks = true;
  }

  const handleArchive = () => {
    archiveFolders.mutate([folder.id], {
      onSuccess: () => {
        toast.success(<Trans message="Folder archived" />);
        onArchive?.();
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  const handleUnarchive = () => {
    unarchiveFolders.mutate([folder.id], {
      onSuccess: () => {
        toast.success(<Trans message="Folder unarchived" />);
        onArchive?.();
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  const baseUrl = `/${routeType}/folders/${folder.id}`;

  return (
    <>
      <ShareLinkDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        url={folder.short_url}
      />
      {canDeleteFolder && (
        <DeleteFoldersDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          folderIds={[folder.id]}
          onDelete={onDelete}
        />
      )}
      <Dropdown.Root>
        <Dropdown.Trigger
          render={<Button size={size} variant={variant} color={color} />}
        >
          <MoreVerticalIcon />
        </Dropdown.Trigger>
        <Dropdown.Content>
          {!hideDetailsLinks && (
            <Dropdown.LinkItem render={<Link to={`${baseUrl}/insights`} />}>
              <ChartColumnBigIcon />
              <Trans message="View insights" />
            </Dropdown.LinkItem>
          )}
          {!hideDetailsLinks && (
            <Dropdown.LinkItem render={<Link to={`${baseUrl}/links`} />}>
              <LinkIcon />
              <Trans message="Manage content" />
            </Dropdown.LinkItem>
          )}
          {!hideDetailsLinks && (
            <Dropdown.LinkItem render={<Link to={baseUrl} />}>
              <PencilIcon />
              <Trans message="Edit" />
            </Dropdown.LinkItem>
          )}
          <Dropdown.Item onClick={() => setShareDialogOpen(true)}>
            <Share2Icon />
            <Trans message="Share" />
          </Dropdown.Item>
          {canDeleteFolder && (
            <Dropdown.Item
              onClick={() =>
                folder.deleted_at ? handleUnarchive() : handleArchive()
              }
            >
              <ArchiveIcon />
              {!folder.deleted_at ? (
                <Trans message="Archive" />
              ) : (
                <Trans message="Unarchive" />
              )}
            </Dropdown.Item>
          )}
          {canDeleteFolder && (
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

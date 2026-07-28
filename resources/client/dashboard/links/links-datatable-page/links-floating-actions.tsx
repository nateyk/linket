import {UpdateLinksTagsDialog} from '@app/dashboard/links/dialogs/update-links-tags-dialog';
import {ArchiveLinksDialog} from '@app/dashboard/links/links-datatable-page/archive-links-dialog';
import {DeleteLinksDialog} from '@app/dashboard/links/links-datatable-page/delete-links-dialog';
import {PermissionAwareButton} from '@app/dashboard/upgrade/permission-aware-button';
import {Link} from '@app/gen/schemas/link';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Trans} from '@ui/i18n/trans';
import {ArchiveIcon, TagIcon, TrashIcon} from 'lucide-react';
import {ReactNode, useMemo, useState} from 'react';

type Props = {
  selectedLinks: Link[];
  setSelectedLinks: (links: Link[]) => void;
  onSelectAll?: () => void;
  children?: ReactNode;
};
export function LinksFloatingActions({
  selectedLinks,
  setSelectedLinks,
  onSelectAll,
  children,
}: Props) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const selectedLinkIds = useMemo(
    () => selectedLinks.map(link => link.id),
    [selectedLinks],
  );
  const unarchive = selectedLinks.every(link => link.deleted_at != null);

  return (
    <DashboardLayout.FloatingActions
      selectedItemsCount={selectedLinks.length}
      onClear={() => setSelectedLinks([])}
      onSelectAll={onSelectAll}
    >
      {children}
      <PermissionAwareButton resource="link" action="update">
        <UpdateLinksTagsDialog
          linkIds={selectedLinkIds}
          onSuccess={() => setSelectedLinks([])}
        >
          <Dialog.Trigger render={<Button variant="outline" size="sm" />}>
            <TagIcon />
            <Trans message="Tags" />
          </Dialog.Trigger>
        </UpdateLinksTagsDialog>
      </PermissionAwareButton>

      <PermissionAwareButton resource="link" action="update">
        <ArchiveLinksDialog
          open={archiveDialogOpen}
          onOpenChange={setArchiveDialogOpen}
          links={selectedLinks}
          unarchive={unarchive}
          onSuccess={() => setSelectedLinks([])}
        >
          <AlertDialog.Trigger render={<Button variant="outline" size="sm" />}>
            <ArchiveIcon />
            {unarchive ? (
              <Trans message="Unarchive" />
            ) : (
              <Trans message="Archive" />
            )}
          </AlertDialog.Trigger>
        </ArchiveLinksDialog>
      </PermissionAwareButton>

      <PermissionAwareButton resource="link" action="delete">
        <DeleteLinksDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          linkIds={selectedLinkIds}
          onDelete={() => setSelectedLinks([])}
        >
          <Dialog.Trigger
            render={<Button variant="outline" color="danger" size="sm" />}
          >
            <TrashIcon />
            <Trans message="Delete" />
          </Dialog.Trigger>
        </DeleteLinksDialog>
      </PermissionAwareButton>
    </DashboardLayout.FloatingActions>
  );
}

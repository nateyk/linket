import {CustomPage} from '@app/gen/schemas/custom-page';
import {deleteCustomPageOptions} from '@common/admin/custom-pages/custom-pages-queries';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Item} from '@shadcn/item/item';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {DeleteIcon} from '@ui/icons/material/Delete';
import {EditIcon} from '@ui/icons/material/Edit';
import {useSettings} from '@ui/settings/use-settings';
import {EllipsisIcon, EyeIcon, NewspaperIcon} from 'lucide-react';
import {useState} from 'react';
import {Link} from 'react-router';

export function CustomPageCard({page}: {page: CustomPage}) {
  const {base_url} = useSettings();

  return (
    <Item.Root variant="outline">
      <Item.Media align="center" className="size-9.5 rounded-full border">
        <NewspaperIcon className="size-4" />
      </Item.Media>
      <Item.Content>
        <Item.Title>
          <a
            className="hover:underline"
            target="_blank"
            href={`${base_url}/pages/${page.slug}`}
          >
            {page.title || page.slug}
          </a>
        </Item.Title>
        <Item.Description>
          {page.created_at ? <FormattedDate date={page.created_at} /> : null}
        </Item.Description>
      </Item.Content>
      <Item.Actions>
        <CustomPageActionsButton page={page} />
      </Item.Actions>
    </Item.Root>
  );
}

function CustomPageActionsButton({page}: {page: CustomPage}) {
  const {base_url} = useSettings();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  return (
    <>
      <DeleteCustomPageDialog
        pageId={page.id}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
      <Dropdown.Root>
        <Dropdown.Trigger render={<Button variant="ghost" size="icon" />}>
          <EllipsisIcon />
        </Dropdown.Trigger>
        <Dropdown.Content align="end">
          <Dropdown.LinkItem
            href={`${base_url}/pages/${page.slug}`}
            target="_blank"
          >
            <EyeIcon />
            <Trans message="Preview" />
          </Dropdown.LinkItem>
          <Dropdown.LinkItem render={<Link to={`${page.id}/edit`} />}>
            <EditIcon />
            <Trans message="Edit" />
          </Dropdown.LinkItem>
          <Dropdown.Item
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <DeleteIcon />
            <Trans message="Delete" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </>
  );
}

type DeleteCustomPageDialogProps = {
  pageId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function DeleteCustomPageDialog({
  pageId,
  open,
  onOpenChange,
}: DeleteCustomPageDialogProps) {
  const deletePage = useMutation(deleteCustomPageOptions());

  const handleDelete = () => {
    deletePage.mutate(pageId, {
      onSuccess: () => {
        toast.success(<Trans message="Page deleted" />);
        onOpenChange(false);
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Title>
              <Trans message="Delete page" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="Are you sure you want to delete this page?" />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel disabled={deletePage.isPending}>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={deletePage.isPending}
              onClick={handleDelete}
            >
              <Trans message="Delete" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

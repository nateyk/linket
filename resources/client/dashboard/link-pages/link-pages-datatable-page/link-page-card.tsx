import {useUsage} from '@app/dashboard/use-usage';
import {LinkPageOptionsDialog} from '@app/dashboard/link-pages/link-page-options-dialog';
import {DeleteLinkPagesDialog} from '@app/dashboard/link-pages/link-pages-datatable-page/delete-link-pages-dialog';
import {
  archiveLinkPagesOptions,
  unarchiveLinkPagesOptions,
} from '@app/dashboard/link-pages/link-pages-queries';
import {ResourceCardUser} from '@app/dashboard/links/resource-card-user';
import {LinkPage} from '@app/gen/schemas/link-page';
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
import {ignoreEventsFromPortal} from '@ui/utils/dom/ignore-events-from-portal';
import clsx from 'clsx';
import {
  ArchiveIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  FormIcon,
  PencilIcon,
  Trash,
} from 'lucide-react';
import {use, useState} from 'react';
import {Link, useNavigate} from 'react-router';

type LinkPageCardProps = {
  linkPage: LinkPage;
  isSelected: boolean;
  onToggle: () => void;
};

export function LinkPageCard({
  linkPage,
  isSelected,
  onToggle,
}: LinkPageCardProps) {
  const navigate = useNavigate();

  return (
    <Item.Root
      variant="outline"
      className="cursor-pointer transition-shadow hover:shadow-sm"
      onClick={ignoreEventsFromPortal(e => {
        if (!(e.target as HTMLElement).closest('button, input, a')) {
          navigate(`${linkPage.id}`);
        }
      })}
    >
      <LinkPageMedia isSelected={isSelected} onToggle={onToggle} />
      <Item.Content>
        <Item.Title>{linkPage.title}</Item.Title>
        <Item.Row className="gap-3">
          <div className="text-muted-foreground">
            {linkPage.created_at ? (
              <FormattedDate date={linkPage.created_at} />
            ) : null}
          </div>
          {linkPage.user && <ResourceCardUser user={linkPage.user} />}
        </Item.Row>
      </Item.Content>
      <Item.Actions>
        <LinkPageOptionsDialog page={linkPage} />
        <LinkPageActionsButton linkPage={linkPage} />
      </Item.Actions>
    </Item.Root>
  );
}

type LinkPageMediaProps = {
  isSelected: boolean;
  onToggle: () => void;
};

function LinkPageMedia({isSelected, onToggle}: LinkPageMediaProps) {
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
      <FormIcon
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

type LinkPageActionsButtonProps = {
  linkPage: LinkPage;
};

function LinkPageActionsButton({linkPage}: LinkPageActionsButtonProps) {
  const query = useUsage();
  const {user} = useAuth();
  const archiveLinkPage = useMutation(archiveLinkPagesOptions());
  const unarchiveLinkPage = useMutation(unarchiveLinkPagesOptions());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const canDeleteLinkPage =
    query.data?.data.link_pages.delete || linkPage.user_id === user?.id;
  const canEditLinkPage =
    query.data?.data.link_pages.update || linkPage.user_id === user?.id;

  const handleArchive = () => {
    archiveLinkPage.mutate([linkPage.id], {
      onSuccess: () => {
        toast.positive(message('Link page archived'));
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  const handleUnarchive = () => {
    unarchiveLinkPage.mutate([linkPage.id], {
      onSuccess: () => {
        toast.positive(message('Link page unarchived'));
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
          {canEditLinkPage && !linkPage.deleted_at && (
            <Dropdown.LinkItem render={<Link to={`${linkPage.id}`} />}>
              <PencilIcon />
              <Trans message="Edit" />
            </Dropdown.LinkItem>
          )}
          {!linkPage.deleted_at && (
            <Dropdown.LinkItem
              render={
                <Link
                  to={`/link-pages/${linkPage.id}/preview`}
                  target="_blank"
                />
              }
            >
              <EyeIcon />
              <Trans message="Preview" />
            </Dropdown.LinkItem>
          )}
          <Dropdown.Item
            disabled={!canDeleteLinkPage}
            onClick={() =>
              linkPage.deleted_at ? handleUnarchive() : handleArchive()
            }
          >
            <ArchiveIcon />
            {!linkPage.deleted_at ? (
              <Trans message="Archive" />
            ) : (
              <Trans message="Unarchive" />
            )}
          </Dropdown.Item>
          <Dropdown.Separator />
          <Dropdown.Item
            variant="destructive"
            disabled={!canDeleteLinkPage}
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash />
            <Trans message="Delete" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
      <DeleteLinkPagesDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        ids={[linkPage.id]}
      />
    </>
  );
}

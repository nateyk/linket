import {User} from '@app/gen/schemas/user';
import {BanUsersDialog} from '@common/admin/users/ban-users-dialog';
import {ImpersonateUserDialog} from '@common/admin/users/impersonate-user-dialog';
import {unbanUsersOptions} from '@common/admin/users/users-queries';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {Avatar} from '@shadcn/avatar/avatar';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {checkboxColumnDef} from '@shadcn/table/utils/checkbox-column-def';
import {SortableHeader} from '@shadcn/table/utils/sortable-header';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {ColumnDef} from '@tanstack/react-table';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {CheckIcon} from '@ui/icons/material/Check';
import {EditIcon} from '@ui/icons/material/Edit';
import {LoginIcon} from '@ui/icons/material/Login';
import {PersonOffIcon} from '@ui/icons/material/PersonOff';
import {ConfirmationDialog} from '@ui/overlays/dialog/confirmation-dialog';
import {DialogTrigger} from '@ui/overlays/dialog/dialog-trigger';
import clsx from 'clsx';
import {EllipsisIcon} from 'lucide-react';
import {useState} from 'react';
import {Link} from 'react-router';

export const userDatatableColumns: ColumnDef<User>[] = [
  checkboxColumnDef<User>(),
  {
    id: 'name',
    accessorFn: user => user.email,
    enableSorting: true,
    size: 250,
    header: () => <Trans message="User" />,
    cell: ({row}) => {
      const user = row.original;
      return (
        <div className="flex items-center gap-2">
          <Avatar.Root size="sm">
            <Avatar.Image src={user.image ?? undefined} alt={user.name ?? ''} />
            <Avatar.ColorFallback>{user.name}</Avatar.ColorFallback>
          </Avatar.Root>
          <div className="truncate">{user.name}</div>
        </div>
      );
    },
  },
  {
    id: 'roles',
    header: () => <Trans message="Roles" />,
    cell: ({row}) => {
      const user = row.original;
      return (
        <div className="flex items-center gap-1">
          {user?.roles?.slice(0, 2).map(role => (
            <Badge
              variant="secondary"
              className={clsx('capitalize')}
              key={role.id}
              render={
                <Link to={`/admin/roles/${role.id}/edit`} target="_blank" />
              }
            >
              <Trans message={role.name} />
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    id: 'subscribed',
    header: () => <Trans message="Subscribed" />,
    cell: ({row}) => {
      const user = row.original;
      return user.subscription?.valid ? (
        <CheckIcon className="size-4 text-positive" />
      ) : null;
    },
  },
  {
    id: 'banned_at',
    accessorKey: 'banned_at',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Suspended" />
      </SortableHeader>
    ),
    cell: ({row}) => {
      return row.original.banned_at ? (
        <CheckIcon className="icon-md text-destructive" />
      ) : null;
    },
  },
  {
    id: 'latest_user_session',
    enableSorting: false,
    header: () => <Trans message="Last active" />,
    cell: ({row}) => {
      const user = row.original;
      return user.latest_user_session ? (
        <time>
          <FormattedDate date={user.latest_user_session.updated_at} />
        </time>
      ) : null;
    },
  },
  {
    id: 'created_at',
    accessorKey: 'created_at',
    enableSorting: true,
    header: ({column}) => (
      <SortableHeader column={column}>
        <Trans message="Created at" />
      </SortableHeader>
    ),
    cell: ({row}) => {
      const user = row.original;
      return (
        <time>
          <FormattedDate date={user.created_at} />
        </time>
      );
    },
  },
  {
    id: 'actions',
    size: 1,
    header: () => (
      <span className="hidden">
        <Trans message="Actions" />
      </span>
    ),
    cell: ({row}) => <UserActionsButton user={row.original} />,
  },
];

export function UserActionsButton({user}: {user: User}) {
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [impersonateDialogOpen, setImpersonateDialogOpen] = useState(false);

  return (
    <div className="flex justify-end text-muted-foreground">
      <BanUsersDialog
        userIds={[user.id]}
        open={banDialogOpen}
        onOpenChange={setBanDialogOpen}
      />
      <ImpersonateUserDialog
        user={user}
        open={impersonateDialogOpen}
        onOpenChange={setImpersonateDialogOpen}
      />
      <Dropdown.Root>
        <Dropdown.Trigger render={<Button variant="ghost" size="icon-sm" />}>
          <EllipsisIcon />
        </Dropdown.Trigger>
        <Dropdown.Content>
          <Dropdown.LinkItem render={<Link to={`${user.id}/details`} />}>
            <EditIcon />
            <Trans message="Edit user" />
          </Dropdown.LinkItem>
          {user.banned_at ? (
            <UnbanButton user={user} />
          ) : (
            <Dropdown.Item onClick={() => setBanDialogOpen(true)}>
              <PersonOffIcon />
              <Trans message="Suspend user" />
            </Dropdown.Item>
          )}
          <Dropdown.Item onClick={() => setImpersonateDialogOpen(true)}>
            <LoginIcon />
            <Trans message="Login as user" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </div>
  );
}

interface UnbanButtonProps {
  user: User;
}
function UnbanButton({user}: UnbanButtonProps) {
  const unban = useMutation(unbanUsersOptions);

  const handleClose = (confirmed?: boolean) => {
    if (confirmed) {
      unban.mutate([user.id], {
        onSuccess: () => {
          toast.success(<Trans message="User unsuspended" />);
        },
        onError: err => showHttpErrorToast(err),
      });
    }
  };

  return (
    <DialogTrigger type="modal" onClose={handleClose}>
      <Dropdown.Item variant="destructive">
        <PersonOffIcon />
        <Trans message="Remove suspension" />
      </Dropdown.Item>
      <ConfirmationDialog
        isDanger
        title={<Trans message="Suspend “:name“" values={{name: user.name}} />}
        body={
          <Trans message="Are you sure you want to remove suspension from this user?" />
        }
        confirm={<Trans message="Unsuspend" />}
      />
    </DialogTrigger>
  );
}

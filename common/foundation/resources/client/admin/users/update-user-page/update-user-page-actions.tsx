import {User} from '@app/gen/schemas/user';
import {BanUsersDialog} from '@common/admin/users/ban-users-dialog';
import {
  deleteUsersOptions,
  unbanUsersOptions,
} from '@common/admin/users/users-queries';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {useNavigate} from '@common/ui/navigation/use-navigate';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {ChevronDownIcon} from 'lucide-react';
import {Fragment, ReactNode, useState} from 'react';

interface Props {
  user: User;
  children?: ReactNode;
}

export function UpdateUserPageActions({user, children}: Props) {
  const unban = useMutation(unbanUsersOptions);
  const isSuspended = !!user.banned_at;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);

  const handleToggleSuspend = () => {
    if (isSuspended) {
      unban.mutate([user.id], {
        onSuccess: () => {
          toast.success(
            <Trans
              message="[one User unsuspended|other :count Users unsuspended]"
              values={{count: 1}}
            />,
          );
        },
        onError: err => showHttpErrorToast(err),
      });
    } else {
      setBanDialogOpen(true);
    }
  };

  return (
    <Fragment>
      <BanUsersDialog
        userIds={[user.id]}
        open={banDialogOpen}
        onOpenChange={setBanDialogOpen}
      />
      <DeleteUserAlertDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        user={user}
      />
      <Dropdown.Root>
        <Dropdown.Trigger render={<Button variant="outline" />}>
          <Trans message="Actions" />
          <ChevronDownIcon data-icon="inline-end" />
        </Dropdown.Trigger>
        <Dropdown.Content align="end">
          {children}
          <Dropdown.Item onClick={() => handleToggleSuspend()}>
            {isSuspended ? (
              <Trans message="Unsuspend user" />
            ) : (
              <Trans message="Suspend user" />
            )}
          </Dropdown.Item>
          <Dropdown.Item
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trans message="Delete user" />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Root>
    </Fragment>
  );
}

type DeleteUserAlertDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
};

export function DeleteUserAlertDialog({
  open,
  onOpenChange,
  user,
}: DeleteUserAlertDialogProps) {
  const navigate = useNavigate();
  const deleteUser = useMutation(deleteUsersOptions);

  const handleDelete = () => {
    deleteUser.mutate([user.id], {
      onSuccess: () => {
        toast(
          <Trans
            message="[one User deleted|other :count Users deleted]"
            values={{count: 1}}
          />,
        );
        onOpenChange(false);
        navigate('..', {relative: 'path'});
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
              <Trans message="Delete user" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="Are you sure you want to delete this user?" />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel disabled={deleteUser.isPending}>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={deleteUser.isPending}
              onClick={() => handleDelete()}
            >
              <Trans message="Delete" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

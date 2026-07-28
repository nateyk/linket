import {impersonateUserOptions} from '@common/admin/users/users-queries';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {LoginIcon} from '@ui/icons/material/Login';

interface ImpersonateUserDialogProps {
  user: {id: number};
  children?: AlertDialog.TriggerElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}
export function ImpersonateUserDialog({
  user,
  children,
  open,
  onOpenChange,
}: ImpersonateUserDialogProps) {
  const impersonate = useMutation(impersonateUserOptions);

  const handleImpersonate = () => {
    impersonate.mutate(
      user.id,
      {
        onSuccess: response => {
          toast(
            <Trans
              message='Impersonating user ":name"'
              values={{name: response.data.name}}
            />,
          );
          window.location.href = '/';
        },
        onError: err => showHttpErrorToast(err),
      },
    );
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {children}
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Media>
              <LoginIcon />
            </AlertDialog.Media>
            <AlertDialog.Title>
              <Trans message="Impersonate user" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="This will log you out of your current account and log you in as the user." />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel disabled={impersonate.isPending}>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              disabled={impersonate.isPending}
              onClick={handleImpersonate}
            >
              <Trans message="Impersonate" />
            </AlertDialog.Action>
          </AlertDialog.Footer>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

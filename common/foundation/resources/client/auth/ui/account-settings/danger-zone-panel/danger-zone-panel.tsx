import {AccountSettingsId} from '@common/auth/ui/account-settings/account-settings-sidenav';
import {usePasswordConfirmedAction} from '@common/auth/ui/confirm-password/use-password-confirmed-action';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {useState} from 'react';
import {AccountSettingsPanel} from '../account-settings-panel';
import {useDeleteAccount} from './delete-account';

export function DangerZonePanel() {
  const deleteAccount = useDeleteAccount();
  const {withConfirmedPassword, isLoading: confirmingPassword} =
    usePasswordConfirmedAction();

  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  return (
    <AccountSettingsPanel
      id={AccountSettingsId.DeleteAccount}
      title={<Trans message="Danger zone" />}
    >
      <AlertDialog.Root
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Content size="sm">
            <AlertDialog.Header>
              <AlertDialog.Title>
                <Trans message="Delete account?" />
              </AlertDialog.Title>
              <AlertDialog.Description>
                <Trans message="Your account will be deleted immediately and permanently. Once deleted, accounts can not be restored." />
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>
                <Trans message="Cancel" />
              </AlertDialog.Cancel>
              <AlertDialog.Action
                color="danger"
                disabled={deleteAccount.isPending}
                onClick={() => deleteAccount.mutate()}
              >
                <Trans message="Delete" />
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
      <Button
        variant="default"
        size="sm"
        color="danger"
        disabled={confirmingPassword || deleteAccount.isPending}
        onClick={() => {
          withConfirmedPassword(() => {
            setConfirmDialogOpen(true);
          });
        }}
      >
        <Trans message="Delete account" />
      </Button>
    </AccountSettingsPanel>
  );
}

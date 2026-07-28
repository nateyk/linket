import {User} from '@app/gen/schemas/user';
import {deleteAccessTokenOptions} from '@common/auth/ui/account-settings/account-settings-queries';
import {AccountSettingsId} from '@common/auth/ui/account-settings/account-settings-sidenav';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import clsx from 'clsx';
import {KeyIcon, TrashIcon} from 'lucide-react';
import {ReactNode, useState} from 'react';
import {useAuth} from '../../../use-auth';
import {AccountSettingsPanel} from '../account-settings-panel';
import {CreateNewTokenDialog} from './create-new-token-dialog';

export function AccessTokenPanel({user}: {user: User}) {
  const tokens = user.tokens || [];
  const {hasPermission, user: authUser} = useAuth();
  const {api, base_url} = useSettings();
  if (!api?.integrated || !hasPermission('api.access')) return null;
  return (
    <AccountSettingsPanel
      id={AccountSettingsId.Developers}
      title={<Trans message="API access tokens" />}
      titleSuffix={
        <a
          className="text-primary hover:underline"
          href={`${base_url}/api-docs`}
          target="_blank"
        >
          <Trans message="Documentation" />
        </a>
      }
      actions={user.id === authUser?.id ? <CreateNewTokenButton /> : null}
    >
      {!tokens.length ? (
        <Empty.Root>
          <Empty.Header>
            <Empty.Media variant="icon">
              <KeyIcon />
            </Empty.Media>
            <Empty.Title>
              {user.id === authUser?.id ? (
                <Trans message="You have no personal access tokens yet" />
              ) : (
                <Trans message="User has not created any access tokens yet" />
              )}
            </Empty.Title>
          </Empty.Header>
        </Empty.Root>
      ) : (
        tokens.map((token, index) => (
          <TokenLine
            token={token}
            key={token.id}
            isLast={index === tokens.length - 1}
          />
        ))
      )}
    </AccountSettingsPanel>
  );
}

interface TokenLineProps {
  token: NonNullable<User['tokens']>[number];
  isLast: boolean;
}
function TokenLine({token, isLast}: TokenLineProps) {
  return (
    <div
      className={clsx(
        'flex items-center gap-6',
        !isLast && 'mb-3 border-b pb-3',
      )}
    >
      <div className="text-sm">
        <div className="font-semibold">
          <Trans message="Name" />
        </div>
        <div>{token.name}</div>
        <div className="mt-2.5 font-semibold">
          <Trans message="Last used" />
        </div>
        <div>
          {token.last_used_at ? (
            <FormattedDate date={token.last_used_at} />
          ) : (
            <Trans message="Never" />
          )}
        </div>
      </div>
      <DeleteTokenAlert token={token}>
        <AlertDialog.Trigger
          render={
            <Button
              size="icon"
              variant="ghost"
              color="danger"
              className="ml-auto"
            />
          }
        >
          <TrashIcon />
        </AlertDialog.Trigger>
      </DeleteTokenAlert>
    </div>
  );
}

function CreateNewTokenButton() {
  return (
    <CreateNewTokenDialog>
      <Dialog.Trigger render={<Button />}>
        <Trans message="Create token" />
      </Dialog.Trigger>
    </CreateNewTokenDialog>
  );
}

export function DeleteTokenAlert({
  children,
  token,
}: {
  children: ReactNode;
  token: NonNullable<User['tokens']>[number];
}) {
  const [open, setOpen] = useState(false);
  const deleteToken = useMutation(deleteAccessTokenOptions(token.id));
  const handleDelete = () => {
    deleteToken.mutate(undefined, {
      onSuccess: () => toast.success(<Trans message="Token deleted" />),
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <AlertDialog.Portal>
        <AlertDialog.Backdrop />
        <AlertDialog.Content size="sm">
          <AlertDialog.Header>
            <AlertDialog.Title>
              <Trans message="Delete token?" />
            </AlertDialog.Title>
            <AlertDialog.Description>
              <Trans message="This token will be deleted immediately and permanently. Once deleted, it can no longer be used to make API requests." />
            </AlertDialog.Description>
          </AlertDialog.Header>
          <AlertDialog.Footer>
            <AlertDialog.Cancel>
              <Trans message="Cancel" />
            </AlertDialog.Cancel>
            <AlertDialog.Action
              color="danger"
              disabled={deleteToken.isPending}
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

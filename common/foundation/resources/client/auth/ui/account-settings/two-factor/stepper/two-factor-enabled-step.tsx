import {User} from '@app/gen/schemas/user';
import {
  disableTwoFactorOptions,
  regenerateTwoFactorCodesOptions,
} from '@common/auth/auth-queries';
import {TwoFactorStepperLayout} from '@common/auth/ui/account-settings/two-factor/stepper/two-factor-stepper-layout';
import {usePasswordConfirmedAction} from '@common/auth/ui/confirm-password/use-password-confirmed-action';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {queryClient} from '@common/http/query-client';
import {Button} from '@shadcn/button/button';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {Fragment} from 'react';

interface Props {
  user: User;
  onDisabled: () => void;
}
export function TwoFactorEnabledStep({user, onDisabled}: Props) {
  const disableTwoFactor = useMutation(disableTwoFactorOptions());
  const regenerateCodes = useMutation(regenerateTwoFactorCodesOptions());
  const {withConfirmedPassword, isLoading: confirmPasswordIsLoading} =
    usePasswordConfirmedAction();
  const isLoading =
    disableTwoFactor.isPending ||
    regenerateCodes.isPending ||
    confirmPasswordIsLoading;

  const handleDisableTwoFactor = () => {
    withConfirmedPassword(() => {
      disableTwoFactor.mutate(undefined, {
        onSuccess: () => {
          toast.success(
            <Trans message="Two factor authentication has been disabled." />,
          );
          onDisabled();
        },
        onError: r => showHttpErrorToast(r),
      });
    });
  };

  const handleRegenerateCodes = () => {
    withConfirmedPassword(() => {
      regenerateCodes.mutate(undefined, {
        onSuccess: () => {
          queryClient.invalidateQueries({queryKey: ['users']});
        },
        onError: r => showHttpErrorToast(r),
      });
    });
  };

  const actions = (
    <Fragment>
      <Button
        type="button"
        onClick={() => handleRegenerateCodes()}
        variant="outline"
        disabled={isLoading}
      >
        <Trans message="Regenerate recovery codes" />
      </Button>
      <Button
        type="submit"
        variant="default"
        color="danger"
        disabled={isLoading}
        onClick={() => handleDisableTwoFactor()}
      >
        <Trans message="Disable" />
      </Button>
    </Fragment>
  );

  return (
    <TwoFactorStepperLayout
      title={<Trans message="You have enabled two factor authentication." />}
      description={
        <Trans message="Store these recovery codes in a secure password manager. They can be used to recover access to your account if your two factor authentication device is lost." />
      }
      actions={actions}
    >
      <div className="mb-4 flex flex-col gap-1 rounded-card bg-muted p-4 font-mono text-sm">
        {user.two_factor_recovery_codes?.map(code => (
          <div key={code}>{code}</div>
        ))}
      </div>
    </TwoFactorStepperLayout>
  );
}

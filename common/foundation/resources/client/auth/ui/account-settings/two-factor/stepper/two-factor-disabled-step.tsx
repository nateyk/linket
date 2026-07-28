import {enableTwoFactorOptions} from '@common/auth/auth-queries';
import {TwoFactorStepperLayout} from '@common/auth/ui/account-settings/two-factor/stepper/two-factor-stepper-layout';
import {usePasswordConfirmedAction} from '@common/auth/ui/confirm-password/use-password-confirmed-action';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {Button} from '@shadcn/button/button';
import {useMutation} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';

interface Props {
  onEnabled: () => void;
}
export function TwoFactorDisabledStep({onEnabled}: Props) {
  const enableTwoFactor = useMutation(enableTwoFactorOptions());
  const {withConfirmedPassword, isLoading: confirmPasswordIsLoading} =
    usePasswordConfirmedAction();
  const isLoading = enableTwoFactor.isPending || confirmPasswordIsLoading;

  const handleEnableTwoFactor = () => {
    withConfirmedPassword(() => {
      enableTwoFactor.mutate(undefined, {
        onSuccess: onEnabled,
        onError: r => showHttpErrorToast(r),
      });
    });
  };

  return (
    <TwoFactorStepperLayout
      title={
        <Trans message="You have not enabled two factor authentication." />
      }
      actions={
        <Button
          variant="default"
          color="primary"
          disabled={isLoading}
          onClick={() => handleEnableTwoFactor()}
        >
          <Trans message="Enable" />
        </Button>
      }
    />
  );
}

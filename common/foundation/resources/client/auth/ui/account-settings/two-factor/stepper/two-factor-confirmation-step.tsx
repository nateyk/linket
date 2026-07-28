import {
  confirmTwoFactorOptions,
  disableTwoFactorOptions,
  twoFactorQrCodeOptions,
} from '@common/auth/auth-queries';
import {TwoFactorStepperLayout} from '@common/auth/ui/account-settings/two-factor/stepper/two-factor-stepper-layout';
import {usePasswordConfirmedAction} from '@common/auth/ui/confirm-password/use-password-confirmed-action';
import {onFormQueryError} from '@common/http/errors/on-form-query-error';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {queryClient} from '@common/http/query-client';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {HookForm} from '@shadcn/forms/form/hook-form';
import {Input} from '@shadcn/forms/input/input';
import {useMutation, useQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {Skeleton} from '@ui/skeleton/skeleton';
import {ReactNode} from 'react';
import {useForm} from 'react-hook-form';

interface Props {
  onCancel: () => void;
  onConfirmed: () => void;
}
export function TwoFactorConfirmationStep(props: Props) {
  const {data} = useQuery(twoFactorQrCodeOptions());

  return (
    <TwoFactorStepperLayout
      title={<Trans message="Finish enabling two factor authentication." />}
      description={
        <Trans message="To finish enabling two factor authentication, scan the following QR code using your phone's authenticator application or enter the setup key and provide the generated OTP code." />
      }
    >
      {!data ? (
        <QrCodeLayout
          svg={<Skeleton variant="rect" className="size-full" />}
          secret={<Skeleton variant="text" className="max-w-56" />}
        />
      ) : (
        <QrCodeLayout
          svg={<div dangerouslySetInnerHTML={{__html: data.svg}} />}
          secret={
            <Trans message="Setup key: :key" values={{key: data.secret}} />
          }
        />
      )}
      <CodeForm {...props} />
    </TwoFactorStepperLayout>
  );
}

function CodeForm({onCancel, onConfirmed}: Props) {
  const form = useForm<{code: string}>();
  const confirmTwoFactor = useMutation(confirmTwoFactorOptions());
  const disableTwoFactor = useMutation(disableTwoFactorOptions());
  const {withConfirmedPassword, isLoading: confirmPasswordIsLoading} =
    usePasswordConfirmedAction();
  const isLoading =
    confirmTwoFactor.isPending ||
    disableTwoFactor.isPending ||
    confirmPasswordIsLoading;

  const handleDisableTwoFactor = () => {
    withConfirmedPassword(() => {
      disableTwoFactor.mutate(undefined, {
        onSuccess: onCancel,
        onError: r => showHttpErrorToast(r),
      });
    });
  };

  const handleConfirmTwoFactor = (values: {code: string}) => {
    withConfirmedPassword(() => {
      confirmTwoFactor.mutate(values, {
        onSuccess: () => {
          queryClient.invalidateQueries({queryKey: ['users']});
          onConfirmed();
        },
        onError: r => onFormQueryError(r, form),
      });
    });
  };

  return (
    <HookForm.Root
      form={form}
      onSubmit={values => handleConfirmTwoFactor(values)}
    >
      <HookForm.Field name="code">
        <Field.Label>
          <Trans message="Code" />
        </Field.Label>
        <Input type="text" required autoFocus />
        <Field.Error />
      </HookForm.Field>
      <div className="mt-6 flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={isLoading}
          onClick={() => handleDisableTwoFactor()}
        >
          <Trans message="Cancel" />
        </Button>
        <Button
          type="submit"
          variant="default"
          color="primary"
          disabled={isLoading}
        >
          <Trans message="Confirm" />
        </Button>
      </div>
    </HookForm.Root>
  );
}

interface QrCodeLayoutProps {
  svg: ReactNode;
  secret: ReactNode;
}
function QrCodeLayout({svg, secret}: QrCodeLayoutProps) {
  return (
    <div>
      <div className="mb-4 h-48 w-48">{svg}</div>
      <div className="mb-4 text-sm font-medium">{secret}</div>
    </div>
  );
}

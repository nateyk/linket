import {CustomDomain} from '@app/gen/schemas/custom-domain';
import {HostStep} from '@common/custom-domains/connect-domain-dialog/host-step';
import {InfoStep} from '@common/custom-domains/connect-domain-dialog/info-step';
import {DomainDnsFailReason} from '@common/custom-domains/connect-domain-dialog/use-validate-domain-dns';
import {ValidationFailedStep} from '@common/custom-domains/connect-domain-dialog/validation-failed-step';
import {useControlledState} from '@react-stately/utils';
import {Dialog} from '@shadcn/dialog/dialog';
import {Trans} from '@ui/i18n/trans';
import {ReactElement, useState} from 'react';

export interface DomainValidationErrorResponse {
  failReason: 'serverNotConfigured' | 'dnsNotSetup';
}

type Props = {
  domain?: CustomDomain;
  showGlobal?: boolean;
  children?: ReactElement<typeof Dialog.Trigger>;
  onSuccess: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

enum Step {
  Host = 1,
  Info = 2,
  ValidationFailed = 3,
}

export function ConnectDomainDialog({
  domain,
  showGlobal,
  children,
  onSuccess,
  open: openProp,
  onOpenChange: onOpenChangeProp,
}: Props) {
  const [open, setOpen] = useControlledState(openProp, false, onOpenChangeProp);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      {children}
      <Dialog.Portal>
        <Dialog.Backdrop />
        <DialogContent
          domain={domain}
          showGlobal={showGlobal ?? false}
          onSuccess={() => {
            setOpen(false);
            onSuccess();
          }}
        />
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type DialogContentProps = {
  domain?: CustomDomain;
  showGlobal: boolean;
  onSuccess: () => void;
};

function DialogContent({domain, showGlobal, onSuccess}: DialogContentProps) {
  const [step, setStep] = useState<Step>(Step.Host);
  const [serverIp, setServerIp] = useState<string>('');
  const [host, setHost] = useState<string>(domain?.host ?? '');
  const [failReason, setFailReason] = useState<DomainDnsFailReason | null>(
    null,
  );

  let stepComponent: ReactElement | null = null;

  if (step === Step.Host) {
    stepComponent = (
      <HostStep
        host={host}
        showGlobal={showGlobal ?? false}
        onComplete={({serverIp, host}) => {
          setServerIp(serverIp);
          setHost(host);
          setStep(Step.Info);
        }}
      />
    );
  } else if (step === Step.Info) {
    stepComponent = (
      <InfoStep
        host={host}
        serverIp={serverIp}
        domain={domain}
        onGoBack={() => setStep(Step.Host)}
        onComplete={() => onSuccess()}
        onValidationFailed={({failReason}) => {
          setFailReason(failReason);
          setStep(Step.ValidationFailed);
        }}
      />
    );
  } else if (step === Step.ValidationFailed) {
    stepComponent = (
      <ValidationFailedStep
        host={host}
        serverIp={serverIp}
        domain={domain}
        failReason={failReason ?? 'dnsNotSetup'}
        onGoBack={() => setStep(Step.Info)}
        onComplete={() => onSuccess()}
      />
    );
  }

  return (
    <Dialog.Content>
      <Dialog.Header>
        <Dialog.Title>
          <Trans message="Connect domain" />
        </Dialog.Title>
      </Dialog.Header>
      {stepComponent}
    </Dialog.Content>
  );
}

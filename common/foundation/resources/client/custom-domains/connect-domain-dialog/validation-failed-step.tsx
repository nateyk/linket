import {CustomDomain} from '@app/gen/schemas/custom-domain';
import {useAuth} from '@common/auth/use-auth';
import {isSubdomain} from '@common/custom-domains/connect-domain-dialog/is-subdomain';
import {
  DomainDnsFailReason,
  useValidateDomainDns,
} from '@common/custom-domains/connect-domain-dialog/use-validate-domain-dns';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {WarningIcon} from '@ui/icons/material/Warning';
import {useSettings} from '@ui/settings/use-settings';
import {ArrowLeftIcon, RefreshCwIcon} from 'lucide-react';
import {ReactNode, useState} from 'react';

type Props = {
  host: string;
  serverIp: string;
  domain?: CustomDomain;
  failReason: DomainDnsFailReason;
  onGoBack: () => void;
  onComplete: () => void;
};

export function ValidationFailedStep({
  host,
  serverIp,
  domain,
  failReason: propsFailReason,
  onGoBack,
  onComplete,
}: Props) {
  const {base_url} = useSettings();
  const {hasPermission} = useAuth();
  const subdomain = isSubdomain(host);
  const record = subdomain ? 'CNAME' : 'A';
  const location = subdomain ? base_url : serverIp;

  const [failReason, setFailReason] =
    useState<DomainDnsFailReason>(propsFailReason);

  const validateDomainDns = useValidateDomainDns({
    domain,
    onSuccess: () => {
      onComplete();
    },
    onError: failReason => {
      setFailReason(failReason);
    },
  });

  const errorMessage =
    failReason === 'serverNotConfigured' && hasPermission('admin') ? (
      <ErrorMessage>
        <Trans
          message="DNS records for the domain are setup, however it seems that your server is not configured to handle requests from “:host“"
          values={{host: location}}
        />
      </ErrorMessage>
    ) : (
      <ErrorMessage>
        <Trans
          message="The domain is missing :record record pointing to :location or the changes haven't propagated yet."
          values={{record, location}}
        />
      </ErrorMessage>
    );

  return (
    <>
      <Dialog.Body>
        {errorMessage}
        <div className="mt-2.5 text-xs whitespace-nowrap text-muted-foreground">
          <Trans message="You can wait and try again later, or refresh." />
        </div>
      </Dialog.Body>
      <Dialog.Footer>
        <Button
          variant="ghost"
          color="primary"
          onClick={() => onGoBack()}
          disabled={validateDomainDns.isPending}
        >
          <ArrowLeftIcon />
          <Trans message="Previous" />
        </Button>
        <Button
          color="primary"
          onClick={() => validateDomainDns.mutate(host)}
          disabled={validateDomainDns.isPending}
        >
          <Trans message="Refresh" />
          {validateDomainDns.isPending ? (
            <Spinner data-icon="inline-end" />
          ) : (
            <RefreshCwIcon data-icon="inline-end" />
          )}
        </Button>
      </Dialog.Footer>
    </>
  );
}

interface ErrorMessageProps {
  children: ReactNode;
}
function ErrorMessage({children}: ErrorMessageProps) {
  return (
    <div className="flex items-center gap-3 rounded-card-sm bg-warning/15 p-3 text-base font-medium text-warning">
      <WarningIcon size="lg" />
      {children}
    </div>
  );
}

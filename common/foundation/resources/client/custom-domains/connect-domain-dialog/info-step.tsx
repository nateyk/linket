import {CustomDomain} from '@app/gen/schemas/custom-domain';
import {isSubdomain} from '@common/custom-domains/connect-domain-dialog/is-subdomain';
import {useValidateDomainDns} from '@common/custom-domains/connect-domain-dialog/use-validate-domain-dns';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {ArrowLeftIcon, ArrowRightIcon} from 'lucide-react';
import {ReactNode} from 'react';

type Props = {
  host: string;
  serverIp: string;
  domain?: CustomDomain;
  onGoBack: () => void;
  onComplete: () => void;
  onValidationFailed: ({
    failReason,
  }: {
    failReason: 'serverNotConfigured' | 'dnsNotSetup';
  }) => void;
};

export function InfoStep({
  host,
  serverIp,
  domain,
  onGoBack,
  onComplete,
  onValidationFailed,
}: Props) {
  const {base_url} = useSettings();

  const validateDomainDns = useValidateDomainDns({
    domain,
    onSuccess: () => {
      onComplete();
    },
    onError: failReason => {
      onValidationFailed({failReason});
    },
  });

  const message = isSubdomain(host) ? (
    <Message
      title={
        <Trans message="Add this CNAME record to your domain by visiting your DNS provider or registrar." />
      }
      record="CNAME"
      target={base_url}
    />
  ) : (
    <Message
      title={
        <Trans message="Add this A record to your domain by visiting your DNS provider or registrar." />
      }
      record="A"
      target={serverIp}
    />
  );

  return (
    <>
      <Dialog.Body>{message}</Dialog.Body>
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
          disabled={validateDomainDns.isPending}
          onClick={() => validateDomainDns.mutate(host)}
        >
          <Trans message="Next" />
          {validateDomainDns.isPending ? (
            <Spinner data-icon="inline-end" />
          ) : (
            <ArrowRightIcon data-icon="inline-end" />
          )}
        </Button>
      </Dialog.Footer>
    </>
  );
}

interface MessageProps {
  title: ReactNode;
  record: string;
  target: string;
}

function Message({title, record, target}: MessageProps) {
  return (
    <div>
      <div className="mb-2.5 text-muted-foreground">{title}</div>
      <div className="flex items-center gap-3 rounded-card-sm bg-primary/10 p-3 text-base font-semibold text-primary">
        <div>{record}</div>
        {target}
      </div>
    </div>
  );
}

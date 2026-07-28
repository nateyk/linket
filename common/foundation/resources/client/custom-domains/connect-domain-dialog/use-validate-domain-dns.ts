import {
  createDomainOptions,
  updateDomainOptions,
} from '@app/dashboard/custom-domains/domains-queries';
import {CustomDomain} from '@app/gen/schemas/custom-domain';
import {parseApiError} from '@common/http/errors/parsed-api-error';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {apiClient} from '@common/http/query-client';
import {useMutation} from '@tanstack/react-query';

export type DomainDnsFailReason = 'serverNotConfigured' | 'dnsNotSetup';

type Props = {
  domain?: CustomDomain;
  onSuccess: () => void;
  onError: (failReason: DomainDnsFailReason) => void;
};

export function useValidateDomainDns({domain, onSuccess, onError}: Props) {
  const createDomain = useMutation(createDomainOptions());
  const updateDomain = useMutation(updateDomainOptions(domain?.id ?? 0));
  return useMutation({
    mutationFn: (host: string) =>
      apiClient
        .post(`/secure/custom-domains/validate-dns/2BrM45vvfS`, {
          host,
          domain_id: domain?.id,
        })
        .then(r => r.data),
    onSuccess: async (_, host) => {
      try {
        if (domain) {
          await updateDomain.mutateAsync({
            host,
          });
        } else {
          await createDomain.mutateAsync({
            host,
          });
        }
        onSuccess();
      } catch (error) {
        showHttpErrorToast(error);
      }
    },
    onError: err => {
      onError(
        (parseApiError(err).errors.failReason?.[0] ??
          'dnsNotSetup') as DomainDnsFailReason,
      );
    },
  });
}

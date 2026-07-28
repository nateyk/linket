import {DatatableRouteType} from '@app/dashboard/use-datatable-route-type';
import {
  archiveCustomDomain,
  createCustomDomain,
  deleteCustomDomain,
  listCustomDomains,
  retrieveCustomDomain,
  unarchiveCustomDomain,
  updateCustomDomain,
} from '@app/gen/custom-domains';
import {queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {FirstParam, SecondParam} from '@ui/utils/ts/extract-params';

export const domainsBaseKey = ['custom-domains'];

export const listDomainsOptions = (
  routeType: DatatableRouteType,
  search?: FirstParam<typeof listCustomDomains>,
) => {
  const params = search ?? {};
  if (routeType === 'admin') {
    params.workspace_id = 'all';
  }
  return queryOptions({
    queryKey: [...domainsBaseKey, params],
    queryFn: () => listCustomDomains(params),
  });
};

export const retrieveDomainOptions = (domainId: number) =>
  queryOptions({
    queryKey: [...domainsBaseKey, `${domainId}`],
    queryFn: () => retrieveCustomDomain(domainId),
  });

export const createDomainOptions = () => {
  return mutationOptions({
    mutationFn: (body: FirstParam<typeof createCustomDomain>) =>
      createCustomDomain(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: domainsBaseKey,
      });
    },
  });
};

export const updateDomainOptions = (
  domainId: FirstParam<typeof updateCustomDomain>,
) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof updateCustomDomain>) =>
      updateCustomDomain(domainId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: domainsBaseKey,
      });
    },
  });
};

export const deleteDomainOptions = () =>
  mutationOptions({
    mutationFn: (domainId: number) => deleteCustomDomain(domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: domainsBaseKey,
      });
    },
  });

export const archiveDomainOptions = () =>
  mutationOptions({
    mutationFn: (domainId: number) => archiveCustomDomain(domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: domainsBaseKey,
      });
    },
  });

export const unarchiveDomainOptions = () =>
  mutationOptions({
    mutationFn: (domainId: number) => unarchiveCustomDomain(domainId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: domainsBaseKey,
      });
    },
  });

import {
  listNormalizedModels,
  ListNormalizedModelsResult,
} from '@app/gen/normalized-models';
import {ListNormalizedModels200} from '@app/gen/schemas/list-normalized-models200';
import {
  keepPreviousData,
  useQuery,
  UseQueryOptions,
} from '@tanstack/react-query';
import {SecondParam} from '@ui/utils/ts/extract-params';
import {apiClient, queryClient} from '../../http/query-client';

interface Params {
  query?: string;
  perPage?: number;
  with?: string;
  modelIds?: string;
}

export function useNormalizedModels(
  endpoint: string,
  queryParams?: SecondParam<typeof listNormalizedModels>,
  queryOptions?: Omit<
    UseQueryOptions<
      ListNormalizedModelsResult,
      unknown,
      ListNormalizedModelsResult,
      any[]
    >,
    'queryKey' | 'queryFn'
  > | null,
) {
  const {queryKey, params} = buildQueryKeyAndParams(endpoint, queryParams);
  return useQuery({
    queryKey,
    queryFn: () =>
      apiClient<ListNormalizedModels200>({
        url: endpoint,
        method: 'GET',
        params,
      }).then(response => response.data),
    placeholderData: keepPreviousData,
    ...queryOptions,
  });
}

export function prefetchNormalizedModels(
  endpoint: string,
  queryParams?: Params,
) {
  const {queryKey, params} = buildQueryKeyAndParams(endpoint, queryParams);
  return queryClient.ensureQueryData({
    queryKey,
    queryFn: () =>
      apiClient<ListNormalizedModels200>({
        url: endpoint,
        method: 'GET',
        params,
      }).then(response => response.data),
  });
}

function buildQueryKeyAndParams(
  endpoint: string,
  queryParams?: SecondParam<typeof listNormalizedModels>,
) {
  // normalize query params, so different query keys are not generated
  if (queryParams && queryParams.query === '') {
    delete queryParams.query;
  }

  const endpointParts = endpoint.split('/');
  // last part will be resource name most likely (eg. 'normalized-models/users')
  // we will want to put 'users' as first part of query key so that doing
  // queryClient.invalidate(['users']) will invalidate normalzied models as well
  const resourceName = endpointParts.pop() as string;

  const queryKey: (string | Params)[] = [resourceName, ...endpointParts];

  if (queryParams && Object.keys(queryParams).length) {
    queryKey.push(queryParams);
  }

  return {queryKey, params: queryParams};
}

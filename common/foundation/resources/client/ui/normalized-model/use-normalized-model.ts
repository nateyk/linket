import {RetrieveNormalizedModelParams} from '@app/gen/schemas/retrieve-normalized-model-params';
import {RetrieveNormalizedModel200} from '@app/gen/schemas/retrieve-normalized-model200';
import {apiClient} from '@common/http/query-client';
import {useQuery} from '@tanstack/react-query';

export function useNormalizedModel(
  endpoint: string,
  queryParams?: RetrieveNormalizedModelParams,
  queryOptions?: {enabled?: boolean},
) {
  return useQuery({
    queryKey: [endpoint, queryParams],
    queryFn: () =>
      apiClient<RetrieveNormalizedModel200>({
        url: endpoint,
        method: 'GET',
        params: queryParams,
      }).then(response => response.data),
    ...queryOptions,
  });
}

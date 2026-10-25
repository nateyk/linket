import {RetrieveNormalizedModelParams} from '@app/gen/schemas/retrieve-normalized-model-params';
import {RetrieveNormalizedModel200} from '@app/gen/schemas/retrieve-normalized-model200';
import {RetrieveNormalizedModel200Data} from '@app/gen/schemas/retrieve-normalized-model200-data';
import {apiClient} from '@common/http/query-client';
import {useQuery} from '@tanstack/react-query';

/** Linket returns `{data}`, BeDesk-era UI reads `{model}`; expose both. */
export type NormalizedModelResult = RetrieveNormalizedModel200 & {
  model: RetrieveNormalizedModel200Data;
};

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
      }).then(response => ({
        ...response.data,
        model: response.data.data,
      })),
    ...queryOptions,
  });
}

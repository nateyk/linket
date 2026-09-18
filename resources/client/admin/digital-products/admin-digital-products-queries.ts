import {apiClient} from '@common/http/query-client';
import {queryOptions} from '@tanstack/react-query';

export const adminDigitalProductsBaseKey = ['adminDigitalProducts'];

export const adminDigitalProductsOptions = (
  params: Record<string, string | string[]> = {},
) => {
  const mapped: Record<string, string | string[]> = {
    search: params.query ?? '',
    perPage: params.per_page ?? '15',
    status: params.status ?? '',
    page: params.page ?? '1',
    sort: params.sort ?? '',
    scope: params.scope ?? '',
  };
  return queryOptions({
    queryKey: [...adminDigitalProductsBaseKey, params],
    queryFn: () =>
      apiClient
        .get('/api/v1/admin/digital-products', {params: mapped})
        .then(response => response.data),
  });
};
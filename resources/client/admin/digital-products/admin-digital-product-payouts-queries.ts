import {apiClient} from '@common/http/query-client';
import {queryOptions} from '@tanstack/react-query';

export const adminDigitalProductPayoutsBaseKey = ['adminDigitalProductPayouts'];

export const adminDigitalProductPayoutsOptions = (
  params: Record<string, string | string[]> = {},
) => {
  const mapped: Record<string, string | string[]> = {
    search: params.query ?? '',
    perPage: params.per_page ?? '15',
    status: params.status ?? '',
    page: params.page ?? '1',
  };
  return queryOptions({
    queryKey: [...adminDigitalProductPayoutsBaseKey, params],
    queryFn: () =>
      apiClient
        .get('/api/v1/admin/digital-products/payout-requests', {
          params: mapped,
        })
        .then(response => response.data),
  });
};
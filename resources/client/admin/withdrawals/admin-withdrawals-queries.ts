import {apiClient} from '@common/http/query-client';
import {queryOptions} from '@tanstack/react-query';

export const adminWithdrawalsBaseKey = ['adminWithdrawals'];

export const adminWithdrawalsOptions = (
  params: Record<string, string | string[]> = {},
) => {
  const mapped: Record<string, string | string[]> = {
    search: params.query ?? '',
    perPage: params.per_page ?? '15',
    status: params.status ?? '',
    page: params.page ?? '1',
    date_from: params.date_from ?? '',
    date_to: params.date_to ?? '',
    withdrawal_method: params.withdrawal_method ?? '',
  };
  return queryOptions({
    queryKey: [...adminWithdrawalsBaseKey, params],
    queryFn: () =>
      apiClient
        .get('/api/v1/admin/withdrawals', {params: mapped})
        .then(response => response.data),
  });
};
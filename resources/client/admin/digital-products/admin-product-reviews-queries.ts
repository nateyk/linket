import {apiClient} from '@common/http/query-client';
import {queryOptions} from '@tanstack/react-query';

export const adminProductReviewsBaseKey = ['adminProductReviews'];

export const adminProductReviewsOptions = (
  productId: string,
  params: Record<string, string | string[]> = {},
) => {
  const mapped: Record<string, string | string[]> = {
    search: params.query ?? '',
    per_page: params.per_page ?? '15',
    status: params.status ?? '',
    page: params.page ?? '1',
  };
  return queryOptions({
    queryKey: [...adminProductReviewsBaseKey, productId, params],
    queryFn: () =>
      apiClient
        .get(`/api/v1/admin/items/${productId}/reviews`, {
          params: mapped,
        })
        .then(response => response.data),
  });
};
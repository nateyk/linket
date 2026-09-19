import {apiClient} from '@common/http/query-client';
import {queryOptions} from '@tanstack/react-query';

export const adminDigitalProductDetailBaseKey = ['adminDigitalProductDetail'];

export const adminDigitalProductDetailOptions = (productId: string) =>
  queryOptions({
    queryKey: [...adminDigitalProductDetailBaseKey, productId],
    queryFn: () =>
      apiClient
        .get(`/api/v1/admin/digital-products/${productId}`)
        .then(response => response.data),
  });

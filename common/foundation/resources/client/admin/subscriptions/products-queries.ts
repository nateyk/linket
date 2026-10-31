import {
  createProduct,
  deleteProduct,
  listProducts,
  retrieveProduct,
  updateProduct,
} from '@app/gen/subscriptions';
import {apiClient, queryClient} from '@common/http/query-client';
import {mutationOptions, queryOptions} from '@tanstack/react-query';
import {FirstParam, SecondParam} from '@ui/utils/ts/extract-params';

export const productsBaseKey = ['products'];

export const listProductsForPricingPageOptions = () => {
  return queryOptions({
    queryKey: [...productsBaseKey, 'with-faq'],
    queryFn: () => listProducts({fields_preset: 'pricing-page'}),
  });
};

export const listProductsOptions = (
  params: FirstParam<typeof listProducts> = {},
) => {
  return queryOptions({
    queryKey: [
      ...productsBaseKey,
      {
        ...params,
        per_page: 100,
      },
    ],
    queryFn: () => listProducts(params),
  });
};

export const retrieveProductOptions = (productId: number) => {
  return queryOptions({
    queryKey: [...productsBaseKey, `${productId}`],
    queryFn: () => retrieveProduct(productId),
  });
};

export const planSubscribersOptions = (productId: number) =>
  queryOptions({
    queryKey: [...productsBaseKey, productId, 'subscribers'],
    queryFn: () =>
      apiClient
        .get<{data: {data: PlanSubscriber[]; total: number}}>(
          `/api/v1/admin/billing/products/${productId}/subscribers`,
        )
        .then(response => response.data.data),
  });

export const planAuditOptions = (productId: number) =>
  queryOptions({
    queryKey: [...productsBaseKey, productId, 'audit'],
    queryFn: () =>
      apiClient
        .get<{data: {data: PlanAuditEntry[]; total: number}}>(
          `/api/v1/admin/billing/products/${productId}/audit`,
        )
        .then(response => response.data.data),
  });

export type PlanSubscriber = {
  id: number;
  user: {id: number | null; name: string | null; email: string | null};
  status: string;
  gateway: string | null;
  price: {amount: number; currency: string; interval: string; interval_count: number} | null;
  renews_at: string | null;
  ends_at: string | null;
};

export type PlanAuditEntry = {
  id: number;
  product_name: string;
  change_type: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  actor: {id: number; name: string} | null;
  created_at: string | null;
};

export const createProductOptions = () => {
  return mutationOptions({
    mutationFn: (body: FirstParam<typeof createProduct>) => createProduct(body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productsBaseKey,
      });
    },
  });
};

export const updateProductOptions = (productId: number) => {
  return mutationOptions({
    mutationFn: (body: SecondParam<typeof updateProduct>) =>
      updateProduct(productId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productsBaseKey,
      });
    },
  });
};

export const deleteProductOptions = () => {
  return mutationOptions({
    mutationFn: (productId: number) => deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productsBaseKey,
      });
    },
  });
};

export const syncProductsOptions = () => {
  return mutationOptions({
    mutationFn: () => queryClient.invalidateQueries({queryKey: productsBaseKey}),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productsBaseKey,
      });
    },
  });
};

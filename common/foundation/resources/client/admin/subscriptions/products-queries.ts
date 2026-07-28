import {
  createProduct,
  deleteProduct,
  listProducts,
  retrieveProduct,
  syncProducts,
  updateProduct,
} from '@app/gen/subscriptions';
import {queryClient} from '@common/http/query-client';
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
    mutationFn: () => syncProducts(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productsBaseKey,
      });
    },
  });
};

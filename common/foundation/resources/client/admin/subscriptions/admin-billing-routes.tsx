import {
  listProductsOptions,
  retrieveProductOptions,
} from '@common/admin/subscriptions/products-queries';
import {listSubscriptionsOptions} from '@common/admin/subscriptions/subscriptions-queries';
import {authGuard} from '@common/auth/guards/auth-route';
import {queryClient} from '@common/http/query-client';
import {searchParamsFromUrl} from '@ui/utils/urls/search-params-from-url';
import {RouteObject} from 'react-router';

export const adminBillingRoutes: Record<string, RouteObject> = {
  indexSubscriptions: {
    path: 'subscriptions',
    shouldRevalidate: () => false,
    lazy: () =>
      import('@common/admin/subscriptions/subscriptions-datatable-page'),
    loader: async ({request}) => {
      const redirect = authGuard({permission: 'subscriptions.update'});
      if (redirect) return redirect;
      await queryClient.ensureQueryData(
        listSubscriptionsOptions(searchParamsFromUrl(request.url)),
      );
    },
  },
  indexPlans: {
    path: 'plans',
    shouldRevalidate: () => false,
    lazy: () => import('@common/admin/plans/plans-datatable-page'),
    loader: async () => {
      const redirect = authGuard({permission: 'plans.update'});
      if (redirect) return redirect;
      await queryClient.ensureQueryData(listProductsOptions());
    },
  },
  createPlan: {
    path: 'plans/new',
    loader: () => authGuard({permission: 'plans.update'}),
    lazy: () =>
      import('@common/admin/plans/crupdate-plan-page/create-plan-page'),
  },
  updatePlan: {
    path: 'plans/:productId/edit',
    lazy: () => import('@common/admin/plans/crupdate-plan-page/edit-plan-page'),
    loader: async ({params}) => {
      const redirect = authGuard({permission: 'plans.update'});
      if (redirect) return redirect;
      return await queryClient.ensureQueryData(
        retrieveProductOptions(Number(params.productId)),
      );
    },
  },
};

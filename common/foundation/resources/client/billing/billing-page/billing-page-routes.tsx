import {
  listProductsForPricingPageOptions,
  listProductsOptions,
} from '@common/admin/subscriptions/products-queries';
import {getAccountSettingsOptions} from '@common/auth/ui/account-settings/account-settings-queries';
import {auth} from '@common/auth/use-auth';
import {queryClient} from '@common/http/query-client';
import {IndexRouteObject, redirect, RouteObject} from 'react-router';
import {billingRouteNames} from './billing-route-names';

export function billingPageChildRoutes({
  indexRoute,
}: {
  indexRoute?: Omit<IndexRouteObject, 'index'>;
} = {}): RouteObject[] {
  return [
    {
      index: true,
      lazy: () => import('@common/billing/billing-page/billing-page'),
      handle: {billingRouteName: billingRouteNames.billing},
      ...indexRoute,
    },
    {
      path: 'change-payment-method',
      lazy: () =>
        import('@common/billing/billing-page/change-payment-method/change-payment-method-layout'),
      loader: () => queryClient.ensureQueryData(listProductsOptions()),
      children: [
        {
          index: true,
          lazy: () =>
            import('@common/billing/billing-page/change-payment-method/change-payment-method-page'),
          handle: {billingRouteName: billingRouteNames.changePaymentMethod},
        },
        {
          path: 'done',
          lazy: () =>
            import('@common/billing/billing-page/change-payment-method/change-payment-method-done'),
          handle: {billingRouteName: billingRouteNames.changePaymentMethodDone},
        },
      ],
    },
    {
      path: 'change-plan',
      lazy: () => import('@common/billing/billing-page/change-plan-page'),
      loader: () => queryClient.ensureQueryData(listProductsOptions()),
      handle: {billingRouteName: billingRouteNames.changePlan},
    },
    {
      path: 'change-plan/:productId/:priceId/confirm',
      lazy: () =>
        import('@common/billing/billing-page/confirm-plan-change-page'),
      handle: {billingRouteName: billingRouteNames.confirmPlanChange},
    },
    {
      path: 'cancel',
      lazy: () =>
        import('@common/billing/billing-page/confirm-plan-cancellation-page'),
      handle: {billingRouteName: billingRouteNames.cancelPlan},
    },
    {
      path: 'renew',
      lazy: () =>
        import('@common/billing/billing-page/confirm-plan-renewal-page'),
      handle: {billingRouteName: billingRouteNames.renewPlan},
    },
  ];
}

export const billingPageRoutes: RouteObject[] = [
  {
    path: 'pricing',
    lazy: () => import('@common/billing/pricing-table/pricing-page'),
    loader: () =>
      queryClient.ensureQueryData(listProductsForPricingPageOptions()),
  },
  {
    path: 'billing',
    loader: () => {
      if (!auth.isSubscribed) {
        return redirect('/pricing');
      }
      return queryClient.ensureQueryData(getAccountSettingsOptions());
    },
    lazy: () => import('@common/billing/billing-page/billing-page-layout'),
    children: billingPageChildRoutes(),
  },
];

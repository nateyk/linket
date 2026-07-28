import {User} from '@app/gen/schemas/user';
import {changeSubscriptionPlan} from '@app/gen/subscriptions';
import {listProductsOptions} from '@common/admin/subscriptions/products-queries';
import {ActiveTrialBanner} from '@common/billing/billing-page/active-trial-banner';
import {useBillingPageRouteConfig} from '@common/billing/billing-page/billing-page-breadcrumb';
import {billingRouteNames} from '@common/billing/billing-page/billing-route-names';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {queryClient} from '@common/http/query-client';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {Button, LinkButton} from '@shadcn/button/button';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useSuspenseQuery} from '@tanstack/react-query';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {Fragment} from 'react';
import {Navigate, useOutletContext} from 'react-router';
import {useNavigate} from '../../ui/navigation/use-navigate';
import {FormattedPrice} from '../formatted-price';
import {BillingPlanPanel} from './billing-plan-panel';

export function Component() {
  const {productId, priceId} = useRequiredParams(['productId', 'priceId']);
  const navigate = useNavigate();
  const productQuery = useSuspenseQuery(listProductsOptions());
  const userData = useOutletContext<User>();
  const changePlan = useMutation({
    mutationFn: ({
      subscriptionId,
      newProductId,
      newPriceId,
    }: {
      subscriptionId: number;
      newProductId: number;
      newPriceId: number;
    }) =>
      changeSubscriptionPlan(subscriptionId, {
        newProductId,
        newPriceId,
      }),
  });
  const {routes} = useBillingPageRouteConfig();
  const previousUrl = routes[billingRouteNames.changePlan];

  if (`${userData.subscription?.price_id}` === priceId) {
    return <Navigate to="/billing/change-plan" replace />;
  }

  const newProduct = productQuery.data.data.find(p => `${p.id}` === productId);
  const newPrice = newProduct?.prices?.find(p => `${p.id}` === priceId);

  if (!newProduct || !newPrice || !userData.subscription) {
    navigate(previousUrl);
    return null;
  }

  const newDate = (
    <span className="whitespace-nowrap">
      <FormattedDate date={userData.subscription?.renews_at} preset="long" />
    </span>
  );

  const handleChangeSubscriptionPlan = () => {
    changePlan.mutate(
      {
        subscriptionId: userData.subscription!.id,
        newProductId: newProduct.id,
        newPriceId: newPrice.id,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: ['users'],
          });
          toast.success(<Trans message="Plan changed." />);
          navigate(routes[billingRouteNames.billing]);
        },
        onError: err => showHttpErrorToast(err),
      },
    );
  };

  return (
    <Fragment>
      <ActiveTrialBanner className="mb-6" />
      <h1 className="my-8 text-3xl font-bold">
        <Trans message="Confirm your new plan" />
      </h1>
      <BillingPlanPanel title={<Trans message="Changing to" />}>
        <div className="text-xl font-bold">{newProduct.name}</div>
        <FormattedPrice price={newPrice} className="text-lg" />
        <div className="mt-3 mb-12 border-b pb-6 text-base">
          <Trans
            message="You will be charged the new price starting :date"
            values={{date: newDate}}
          />
        </div>
        <div className="flex max-w-118 items-center gap-2">
          <Button
            variant="default"
            color="primary"
            size="lg"
            className="flex-1"
            onClick={() => handleChangeSubscriptionPlan()}
            disabled={changePlan.isPending}
          >
            <Trans message="Confirm" />
          </Button>

          <LinkButton
            variant="outline"
            className="flex-1"
            size="lg"
            to={previousUrl}
          >
            <Trans message="Go back" />
          </LinkButton>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          <Trans message="By confirming your new plan, you agree to our terms of Service and privacy policy." />
        </div>
      </BillingPlanPanel>
    </Fragment>
  );
}

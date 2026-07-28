import {User} from '@app/gen/schemas/user';
import {cancelSubscription as cancelSubscriptionApi} from '@app/gen/subscriptions';
import {ActiveTrialBanner} from '@common/billing/billing-page/active-trial-banner';
import {useBillingPageRouteConfig} from '@common/billing/billing-page/billing-page-breadcrumb';
import {billingRouteNames} from '@common/billing/billing-page/billing-route-names';
import {showHttpErrorToast} from '@common/http/errors/show-http-error-toast';
import {queryClient} from '@common/http/query-client';
import {Button, LinkButton} from '@shadcn/button/button';
import {toast} from '@shadcn/toast/toast';
import {useMutation} from '@tanstack/react-query';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {Fragment} from 'react';
import {useOutletContext} from 'react-router';
import {useNavigate} from '../../ui/navigation/use-navigate';
import {FormattedPrice} from '../formatted-price';
import {BillingPlanPanel} from './billing-plan-panel';

export function Component() {
  const navigate = useNavigate();
  const {routes} = useBillingPageRouteConfig();
  const previousUrl = routes[billingRouteNames.billing];
  const data = useOutletContext<User>();
  const cancelSubscription = useMutation({
    mutationFn: (subscriptionId: number) =>
      cancelSubscriptionApi(subscriptionId),
  });

  if (!data.subscription) {
    return null;
  }

  const product = data.subscription.product;
  const price = data.subscription.price;

  if (!product || !price) {
    return null;
  }

  const renewDate = data.subscription.renews_at ? (
    <span className="whitespace-nowrap">
      <FormattedDate date={data.subscription.renews_at} preset="long" />
    </span>
  ) : null;

  const handleSubscriptionCancel = () => {
    cancelSubscription.mutate(data.subscription!.id, {
      onSuccess: () => {
        Promise.allSettled([
          queryClient.invalidateQueries({
            queryKey: ['users'],
          }),
        ]);
        toast.success(<Trans message="Subscription cancelled." />);
        navigate(previousUrl);
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <Fragment>
      <ActiveTrialBanner className="mb-6" />
      <h1 className="my-8 text-3xl font-bold">
        <Trans message="Cancel your plan" />
      </h1>
      <BillingPlanPanel title={<Trans message="Current plan" />}>
        <div className="">
          <div className="text-xl font-bold">{product.name}</div>
          <FormattedPrice price={price} className="text-lg" />
          <div className="mt-3 mb-12 border-b pb-6 text-base">
            {data.subscription.on_trial ? (
              <Trans
                message="You will not be automatically charged after trial ends, but trial will still be active until :date"
                values={{date: renewDate}}
              />
            ) : (
              <Trans
                message="Your plan will be canceled, but is still available until the end of your billing period on :date"
                values={{date: renewDate}}
              />
            )}
            <div className="mt-5">
              <Trans message="If you change your mind, you can renew your subscription." />
            </div>
          </div>
          <div>
            <div className="flex max-w-118 items-center gap-2">
              <LinkButton
                variant="outline"
                to={previousUrl}
                size="lg"
                className="flex-1"
              >
                <Trans message="Go back" />
              </LinkButton>
              <Button
                variant="default"
                color="primary"
                size="lg"
                className="flex-1"
                onClick={handleSubscriptionCancel}
                disabled={cancelSubscription.isPending}
              >
                <Trans message="Cancel plan" />
              </Button>
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              <Trans message="By cancelling your plan, you agree to our terms of service and privacy policy." />
            </div>
          </div>
        </div>
      </BillingPlanPanel>
    </Fragment>
  );
}

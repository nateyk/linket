import {User} from '@app/gen/schemas/user';
import {resumeSubscription as resumeSubscriptionApi} from '@app/gen/subscriptions';
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
  const resumeSubscription = useMutation({
    mutationFn: (subscriptionId: number) =>
      resumeSubscriptionApi(subscriptionId),
  });

  if (
    !data.subscription ||
    !data.subscription.product ||
    !data.subscription.price
  ) {
    return null;
  }

  const product = data.subscription.product;
  const price = data.subscription.price;

  const endDate = (
    <span className="whitespace-nowrap">
      <FormattedDate date={data.subscription.ends_at} preset="long" />
    </span>
  );

  const handleResumeSubscription = () => {
    resumeSubscription.mutate(data.subscription!.id, {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['users'],
        });
        toast.success(<Trans message="Subscription renewed." />);
        navigate(previousUrl);
      },
      onError: err => showHttpErrorToast(err),
    });
  };

  return (
    <Fragment>
      <ActiveTrialBanner className="mb-6" />
      <h1 className="my-8 text-3xl font-bold">
        <Trans message="Renew your plan" />
      </h1>
      <BillingPlanPanel title={<Trans message="Current plan" />}>
        <div className="text-xl font-bold">{product.name}</div>
        <FormattedPrice price={price} className="text-lg" />
        <div className="mt-3 mb-12 border-b pb-6 text-base">
          <Trans
            message="This plan will no longer be canceled. It will renew on :date"
            values={{date: endDate}}
          />
        </div>
        <div className="flex max-w-118 items-center gap-2">
          <Button
            variant="default"
            color="primary"
            size="lg"
            className="flex-1"
            onClick={handleResumeSubscription}
            disabled={resumeSubscription.isPending}
          >
            <Trans message="Renew plan" />
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
          <Trans message="By renewing your plan, you agree to our terms of service and privacy policy." />
        </div>
      </BillingPlanPanel>
    </Fragment>
  );
}

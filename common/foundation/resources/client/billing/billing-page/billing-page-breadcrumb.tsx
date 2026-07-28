import {billingRouteNames} from '@common/billing/billing-page/billing-route-names';
import {Breadcrumb} from '@shadcn/breadcrumb/breadcrumb';
import {Trans} from '@ui/i18n/trans';
import {useMemo} from 'react';
import {UIMatch, useMatches} from 'react-router';

type MatchType = UIMatch<
  unknown,
  {
    billingRouteName: (typeof billingRouteNames)[keyof typeof billingRouteNames];
    billingRoutePrefix?: string;
  }
>;

type Props = {
  className?: string;
  hideOnIndexRoute?: boolean;
};
export function BillingPageBreadcrumb({className, hideOnIndexRoute}: Props) {
  const {routeName, routes} = useBillingPageRouteConfig();

  if (hideOnIndexRoute && routeName === billingRouteNames.billing) {
    return null;
  }

  switch (routeName) {
    case billingRouteNames.billing:
      return (
        <Breadcrumb.Root className={className}>
          <Breadcrumb.Item className="text-foreground">
            <Trans message="Billing" />
          </Breadcrumb.Item>
        </Breadcrumb.Root>
      );
    case billingRouteNames.changePaymentMethod:
    case billingRouteNames.changePaymentMethodDone:
      return (
        <Breadcrumb.Root className={className}>
          <Breadcrumb.Item>
            <Breadcrumb.Link to={routes[billingRouteNames.billing]}>
              <Trans message="Billing" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>
              <Trans message="Payment method" />
            </Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.Root>
      );
    case billingRouteNames.changePlan:
      return (
        <Breadcrumb.Root className={className}>
          <Breadcrumb.Item>
            <Breadcrumb.Link to={routes[billingRouteNames.billing]}>
              <Trans message="Billing" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>
              <Trans message="Change plan" />
            </Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.Root>
      );
    case billingRouteNames.confirmPlanChange:
      return (
        <Breadcrumb.Root className={className}>
          <Breadcrumb.Item>
            <Breadcrumb.Link to={routes[billingRouteNames.billing]}>
              <Trans message="Billing" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Link to={routes[billingRouteNames.changePlan]}>
              <Trans message="Change plan" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>
              <Trans message="Confirm" />
            </Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.Root>
      );
    case billingRouteNames.cancelPlan:
      return (
        <Breadcrumb.Root className={className}>
          <Breadcrumb.Item>
            <Breadcrumb.Link to={routes[billingRouteNames.billing]}>
              <Trans message="Billing" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>
              <Trans message="Cancel plan" />
            </Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.Root>
      );
    case billingRouteNames.renewPlan:
      return (
        <Breadcrumb.Root className={className}>
          <Breadcrumb.Item>
            <Breadcrumb.Link to={routes[billingRouteNames.billing]}>
              <Trans message="Billing" />
            </Breadcrumb.Link>
          </Breadcrumb.Item>
          <Breadcrumb.Separator />
          <Breadcrumb.Item>
            <Breadcrumb.Page>
              <Trans message="Renew plan" />
            </Breadcrumb.Page>
          </Breadcrumb.Item>
        </Breadcrumb.Root>
      );
  }
}

export function useBillingPageRouteConfig() {
  const matches = useMatches() as MatchType[];
  const billingPage = matches
    .filter(match => match.handle?.billingRouteName)
    .at(-1);
  const pathPrefix =
    matches.find(match => match.handle?.billingRoutePrefix)?.handle
      ?.billingRoutePrefix ?? '';

  const routes: Record<
    (typeof billingRouteNames)[keyof typeof billingRouteNames],
    string
  > = useMemo(() => {
    const p = `/${pathPrefix}/billing`.replace(/\/{2,}/g, '/');
    return {
      [billingRouteNames.billing]: `${p}`,
      [billingRouteNames.changePaymentMethod]: `${p}/change-payment-method`,
      [billingRouteNames.changePaymentMethodDone]: `${p}/change-payment-method/done`,
      [billingRouteNames.changePlan]: `${p}/change-plan`,
      [billingRouteNames.confirmPlanChange]: `${p}/change-plan/confirm`,
      [billingRouteNames.cancelPlan]: `${p}/cancel`,
      [billingRouteNames.renewPlan]: `${p}/renew`,
    };
  }, [pathPrefix]);

  return {
    routeName: billingPage?.handle?.billingRouteName,
    routes,
  };
}

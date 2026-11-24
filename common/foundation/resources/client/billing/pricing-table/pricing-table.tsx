import {Product} from '@app/gen/schemas/product';
import {useAuth} from '@common/auth/use-auth';
import {FormattedPrice} from '@common/billing/formatted-price';
import {
  findBestPrice,
  UpsellBillingCycle,
} from '@common/billing/pricing-table/find-best-price';
import {ProductFeatureList} from '@common/billing/pricing-table/product-feature-list';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {getSiteCurrency} from '@ui/i18n/format-money';
import {setInLocalStorage} from '@ui/utils/hooks/local-storage';
import {Fragment} from 'react';
import {useNavigate} from 'react-router';

interface PricingTableProps {
  selectedCycle: UpsellBillingCycle;
  className?: string;
  products: Product[];
  layout?: 'standard' | 'landing';
}

export function PricingTable({
  selectedCycle,
  className,
  products,
  layout = 'standard',
}: PricingTableProps) {
  return (
    <div
      data-pricing-layout={layout}
      className={cn(
        'mx-auto grid w-full grid-cols-1 items-stretch md:grid-cols-2',
        layout === 'landing'
          ? 'max-w-5xl gap-2 rounded-3xl border border-border bg-card p-2 sm:p-2.5'
          : 'max-w-5xl gap-5 pb-5',
        className,
      )}
    >
      <PlanList plans={products} selectedPeriod={selectedCycle} layout={layout} />
    </div>
  );
}

interface PlanListProps {
  plans: Product[];
  selectedPeriod: UpsellBillingCycle;
  layout: 'standard' | 'landing';
}

function PlanList({plans, selectedPeriod, layout}: PlanListProps) {
  const navigate = useNavigate();
  const {isLoggedIn, isSubscribed} = useAuth();
  const filteredPlans = plans.filter(plan => !plan.hidden);

  return (
    <Fragment>
      {filteredPlans.map(plan => {
        const price = findBestPrice(selectedPeriod, plan.prices ?? []);
        // Free plans have no price record. Keep their price display consistent
        // with paid plans without inventing a backend subscription price.
        const displayPrice = price ?? {
          amount: 0,
          currency: getSiteCurrency(),
          interval: 'month',
          interval_count: 1,
        };

        const isLanding = layout === 'landing';
        let upgradeRoute: string | undefined;
        if (!isLoggedIn && (!isLanding || plan.free || price)) {
          upgradeRoute = '/register?redirectFrom=pricing';
        } else if (!plan.free && price) {
          upgradeRoute = isSubscribed
            ? '/change-plan/' + plan.id + '/' + price.id + '/confirm'
            : '/checkout/' + plan.id + '/' + price.id;
        }

        const billedAnnually =
          selectedPeriod === 'yearly' &&
          price != null &&
          ((price.interval === 'month' && price.interval_count >= 12) ||
            price.interval === 'year');

        const action = (
          <Button
            variant={plan.recommended ? 'default' : 'outline'}
            color="primary"
            size="lg"
            className="w-full"
            disabled={!upgradeRoute}
            onClick={() => {
              if (!isLoggedIn && price) {
                setInLocalStorage('be.onboarding.selected', {
                  productId: plan.id,
                  priceId: price.id,
                });
              }
              if (upgradeRoute) {
                navigate(upgradeRoute);
              }
            }}
          >
            <SubscribeButtonLabel plan={plan} />
          </Button>
        );

        const description = plan.description ? (
          <Trans message={plan.description} />
        ) : (
          <Trans message="Secure digital product payments via Chapa." />
        );

        return (
          <Card.Root
            key={plan.id}
            className={cn(
              'flex h-full min-w-0 flex-col gap-0 py-0 shadow-none',
              isLanding
                ? 'rounded-[1.1rem] border-0 bg-transparent ring-0'
                : 'overflow-visible rounded-card bg-card ring-1 ring-border',
              isLanding && plan.recommended && 'bg-primary/5 ring-1 ring-primary/25 dark:bg-primary/10',
              !isLanding && plan.recommended && 'ring-2 ring-primary',
            )}
          >
            <Card.Header className={cn(
              'gap-0 px-6 pt-7 pb-0 sm:px-8 sm:pt-8',
              isLanding && 'pt-6 sm:pt-8',
            )}>
              <div className="flex min-h-6 items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">
                  <Trans message={plan.name} />
                </h2>
                {plan.recommended ? (
                  <Badge variant="secondary">
                    <Trans message="Most popular" />
                  </Badge>
                ) : null}
              </div>
              {!isLanding && (
                <Card.Description className="mt-3 min-h-10 leading-5">
                  {description}
                </Card.Description>
              )}
            </Card.Header>

            <Card.Content className={cn(
              'flex-1 px-6 pt-7 pb-0 sm:px-8',
              isLanding && 'pt-5 pb-7 sm:pb-8',
            )}>
              {isLanding && !plan.free && !price ? (
                <p className="text-base font-medium text-muted-foreground">
                  <Trans message="Price unavailable" />
                </p>
              ) : (
                <FormattedPrice
                  className="flex-wrap items-baseline"
                  priceClassName={cn(
                    'font-semibold tracking-tight text-foreground',
                    isLanding ? 'text-3xl sm:text-4xl' : 'text-4xl',
                  )}
                  periodClassName="text-sm text-muted-foreground"
                  variant="slash"
                  price={displayPrice}
                />
              )}
              {isLanding ? (
                <p className="mt-2 min-h-5 text-xs text-muted-foreground">
                  {billedAnnually ? <Trans message="Billed annually" /> : null}
                </p>
              ) : billedAnnually ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  <Trans message="Billed annually" />
                </p>
              ) : null}
              {isLanding ? (
                <>
                  <Card.Description className="mt-4 min-h-10 text-sm leading-6 sm:min-h-12">
                    {description}
                  </Card.Description>
                  <div className="mt-6">{action}</div>
                </>
              ) : null}
              <ProductFeatureList product={plan} />
            </Card.Content>

            {!isLanding ? (
              <Card.Footer className="mt-6 px-6 pt-0 pb-7 sm:px-8 sm:pb-8">
                {action}
              </Card.Footer>
            ) : null}
          </Card.Root>
        );
      })}
    </Fragment>
  );
}

type SubscribeButtonLabelProps = {
  plan: Product;
};

function SubscribeButtonLabel({plan}: SubscribeButtonLabelProps) {
  const {isLoggedIn, isSubscribed} = useAuth();
  if (plan.free) {
    if (isSubscribed) {
      return <Trans message="Free plan" />;
    }
    return <Trans message={isLoggedIn ? 'Current plan' : 'Get started'} />;
  }
  if (!isLoggedIn) {
    if (plan.trial_period_days > 0) {
      return (
        <Trans
          message="Free :days day trial"
          values={{days: plan.trial_period_days}}
        />
      );
    }
    return <Trans message="Get started" />;
  }
  return <Trans message="Upgrade" />;
}

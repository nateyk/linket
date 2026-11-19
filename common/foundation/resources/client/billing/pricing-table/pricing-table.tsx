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
}

export function PricingTable({
  selectedCycle,
  className,
  products,
}: PricingTableProps) {
  return (
    <div
      className={cn(
        'mx-auto grid w-full max-w-5xl grid-cols-1 items-stretch gap-5 pb-5 md:grid-cols-2',
        className,
      )}
    >
      <PlanList plans={products} selectedPeriod={selectedCycle} />
    </div>
  );
}

interface PlanListProps {
  plans: Product[];
  selectedPeriod: UpsellBillingCycle;
}

function PlanList({plans, selectedPeriod}: PlanListProps) {
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

        let upgradeRoute: string | undefined;
        if (!isLoggedIn) {
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

        return (
          <Card.Root
            key={plan.id}
            className={cn(
              'h-full gap-0 overflow-visible rounded-card bg-card py-0 shadow-none ring-1 ring-border',
              plan.recommended && 'ring-2 ring-primary',
            )}
          >
            <Card.Header className="gap-0 px-6 pt-7 pb-0 sm:px-8 sm:pt-8">
              <div className="flex min-h-6 items-center justify-between gap-3">
                <Card.Title className="text-lg font-semibold text-foreground">
                  <Trans message={plan.name} />
                </Card.Title>
                {plan.recommended ? (
                  <Badge variant="secondary">
                    <Trans message="Most popular" />
                  </Badge>
                ) : null}
              </div>
              <Card.Description className="mt-3 min-h-10 leading-5">
                {plan.description ? (
                  <Trans message={plan.description} />
                ) : (
                  <Trans message="Secure digital product payments via Chapa." />
                )}
              </Card.Description>
            </Card.Header>

            <Card.Content className="flex-1 px-6 pt-7 pb-0 sm:px-8">
              <FormattedPrice
                className="flex-wrap items-baseline"
                priceClassName="text-4xl font-semibold tracking-tight text-foreground"
                periodClassName="text-sm text-muted-foreground"
                variant="slash"
                price={displayPrice}
              />
              {billedAnnually ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  <Trans message="Billed annually" />
                </p>
              ) : null}
              <ProductFeatureList product={plan} />
            </Card.Content>

            <Card.Footer className="mt-6 px-6 pt-0 pb-7 sm:px-8 sm:pb-8">
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
            </Card.Footer>
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
  const {isLoggedIn} = useAuth();
  if (plan.free) {
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

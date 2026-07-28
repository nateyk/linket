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
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
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
        'flex flex-col items-stretch gap-6 overflow-x-auto overflow-y-visible pb-5 md:flex-row md:justify-center',
        className,
      )}
    >
      <PlanList
        key="plan-list"
        plans={products}
        selectedPeriod={selectedCycle}
      />
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
      {filteredPlans.map((plan, index) => {
        const isFirst = index === 0;
        const isLast = index === filteredPlans.length - 1;
        const price = findBestPrice(selectedPeriod, plan.prices ?? []);

        let upgradeRoute: string | undefined;
        if (!isLoggedIn) {
          upgradeRoute = `/register?redirectFrom=pricing`;
        }
        if (isSubscribed) {
          upgradeRoute = `/change-plan/${plan.id}/${price?.id}/confirm`;
        }
        if (isLoggedIn && !plan.free) {
          upgradeRoute = `/checkout/${plan.id}/${price?.id}`;
        }

        return (
          <div
            key={plan.id}
            className={cn(
              'w-full max-w-125 rounded-card border bg-card p-8 shadow-sm',
              isFirst && 'ml-auto',
              isLast && 'mr-auto',
            )}
          >
            <div className="mb-8">
              <Badge
                variant="secondary"
                className={cn(
                  'mb-5 h-6 w-min',
                  !plan.recommended && 'invisible',
                )}
              >
                <Trans message="Most popular" />
              </Badge>
              <div className="mb-3 text-xl font-semibold">
                <Trans message={plan.name} />
              </div>
              {plan.description ? (
                <div className="text-sm text-muted-foreground">
                  <Trans message={plan.description} />
                </div>
              ) : null}
            </div>
            <div>
              {price ? (
                <FormattedPrice
                  priceClassName="font-bold text-4xl"
                  periodClassName="text-muted-foreground text-xs"
                  variant="separateLine"
                  price={price}
                />
              ) : (
                <div className="text-4xl font-bold">
                  <Trans message="Free" />
                </div>
              )}
              <div className="mt-15">
                <Button
                  variant={plan.recommended ? 'default' : 'outline'}
                  color="primary"
                  size="lg"
                  className="w-full"
                  disabled={!upgradeRoute}
                  onClick={() => {
                    if (!isLoggedIn && price && plan) {
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
              </div>
              <ProductFeatureList product={plan} />
            </div>
          </div>
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
    return <Trans message="Get started" />;
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

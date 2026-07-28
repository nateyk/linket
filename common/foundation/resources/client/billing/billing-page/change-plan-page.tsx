import {Product} from '@app/gen/schemas/product';
import {User} from '@app/gen/schemas/user';
import {listProductsOptions} from '@common/admin/subscriptions/products-queries';
import {ActiveTrialBanner} from '@common/billing/billing-page/active-trial-banner';
import {LinkButton} from '@shadcn/button/button';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {CheckIcon} from 'lucide-react';
import {Fragment, useState} from 'react';
import {useOutletContext} from 'react-router';
import {FormattedPrice} from '../formatted-price';
import {BillingCycleRadio} from '../pricing-table/billing-cycle-radio';
import {
  findBestPrice,
  UpsellBillingCycle,
} from '../pricing-table/find-best-price';
import {BillingPlanPanel} from './billing-plan-panel';

export function Component() {
  return (
    <Fragment>
      <ActiveTrialBanner className="mb-6" />
      <h1 className="my-8 text-3xl font-bold">
        <Trans message="Select a new plan" />
      </h1>
      <BillingPlanPanel title={<Trans message="Available plans" />}>
        <PlanList />
      </BillingPlanPanel>
    </Fragment>
  );
}

function PlanList() {
  const query = useSuspenseQuery(listProductsOptions());
  const products = query.data?.data ?? [];
  const [selectedCycle, setSelectedCycle] =
    useState<UpsellBillingCycle>('monthly');

  return (
    <Fragment key="plan-list">
      <BillingCycleRadio
        products={products}
        selectedCycle={selectedCycle}
        onChange={setSelectedCycle}
        className="mb-5"
      />
      {products.map(plan => {
        const price = findBestPrice(selectedCycle, plan.prices ?? []);
        if (!price || plan.hidden) return null;
        return (
          <div
            key={plan.id}
            className="justify-between gap-10 border-b py-8 md:flex"
          >
            <div className="mb-10 md:mb-0">
              <div className="text-xl font-bold">{plan.name}</div>
              <FormattedPrice price={price} className="text-lg" />
              <div className="mt-3 text-base">{plan.description}</div>
              <FeatureList plan={plan} />
            </div>
            <ContinueButton product={plan} price={price} />
          </div>
        );
      })}
    </Fragment>
  );
}

interface FeatureListProps {
  plan: Product;
}
function FeatureList({plan}: FeatureListProps) {
  if (!plan.feature_list.length) return null;
  return (
    <div className="mt-8">
      <div className="mb-2.5 text-sm font-semibold">
        <Trans message="What's included" />
      </div>
      {plan.feature_list.map(feature => (
        <div key={feature} className="flex items-center gap-2.5 text-sm">
          <CheckIcon className="text-positive" />
          <Trans message={feature} />
        </div>
      ))}
    </div>
  );
}

interface ContinueButtonProps {
  product: Product;
  price: NonNullable<Product['prices']>[number];
}
function ContinueButton({product, price}: ContinueButtonProps) {
  const data = useOutletContext<User>();

  if (
    data.subscription?.product_id === product.id &&
    data.subscription?.price_id === price.id
  ) {
    return (
      <div className="flex w-42 items-center justify-center gap-2.5">
        <CheckIcon className="size-4" />
        <Trans message="Current plan" />
      </div>
    );
  }

  return (
    <LinkButton
      variant="default"
      color="primary"
      className="w-42"
      size="lg"
      to={`${product.id}/${price.id}/confirm`}
    >
      <Trans message="Continue" />
    </LinkButton>
  );
}

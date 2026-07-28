import {listProductsOptions} from '@common/admin/subscriptions/products-queries';
import {BillingCycleRadio} from '@common/billing/pricing-table/billing-cycle-radio';
import {UpsellBillingCycle} from '@common/billing/pricing-table/find-best-price';
import {PricingTable} from '@common/billing/pricing-table/pricing-table';
import {useSuspenseQuery} from '@tanstack/react-query';
import {getBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {Trans} from '@ui/i18n/trans';
import {useState} from 'react';

export type LandingPagePricingConfig = {
  name: 'pricing';
  title?: string;
  description?: string;
};

type Props = {
  config: LandingPagePricingConfig;
};

export function LandingPagePricing({config}: Props) {
  const query = useSuspenseQuery({
    ...listProductsOptions(),
    staleTime: Infinity,
    initialData: () => {
      const products = getBootstrapData().loaders?.landingPage?.products;
      if (products) {
        return products;
      }
    },
  });
  const [selectedCycle, setSelectedCycle] =
    useState<UpsellBillingCycle>('yearly');
  return (
    <div
      className="mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8"
      id="pricing-section"
    >
      <div className="mb-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-base/7 font-semibold text-primary">
            <Trans message="Pricing" />
          </h2>
          {config.title ? (
            <p className="mt-2 text-5xl font-semibold tracking-tight text-balance text-foreground sm:text-6xl">
              <Trans message={config.title} />
            </p>
          ) : null}
        </div>
        {config.description ? (
          <p className="mx-auto mt-6 max-w-2xl text-center text-lg font-medium text-pretty text-muted-foreground sm:text-xl/8">
            <Trans message={config.description} />
          </p>
        ) : null}
      </div>
      <BillingCycleRadio
        products={query.data?.data}
        selectedCycle={selectedCycle}
        onChange={setSelectedCycle}
        className="mb-10 flex justify-center"
      />
      <PricingTable selectedCycle={selectedCycle} products={query.data?.data} />
    </div>
  );
}

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
      className="mx-auto max-w-7xl px-5 py-20 sm:px-6 sm:py-24 lg:px-8"
      id="pricing-section"
    >
      <div className="mb-10 sm:mb-12">
        <div className="mx-auto max-w-4xl text-center">
          {config.title ? (
            <p className="text-sm font-semibold text-primary">
              <Trans message="Pricing" />
            </p>
          ) : null}
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl">
            <Trans message={config.title || 'Pricing'} />
          </h2>
        </div>
        {config.description ? (
          <p className="mx-auto mt-4 max-w-2xl text-center text-base leading-7 text-muted-foreground sm:text-lg">
            <Trans message={config.description} />
          </p>
        ) : null}
      </div>
      <BillingCycleRadio
        products={query.data?.data}
        selectedCycle={selectedCycle}
        onChange={setSelectedCycle}
        className="mb-7 flex justify-center sm:mb-9"
      />
      <PricingTable layout="landing" selectedCycle={selectedCycle} products={query.data?.data} />
    </div>
  );
}

import {listProductsForPricingPageOptions} from '@common/admin/subscriptions/products-queries';
import {PricingTable} from '@common/billing/pricing-table/pricing-table';
import {
  LandingPageFaq,
  LandingPageFaqConfig,
} from '@common/ui/landing-page/faq/landing-page-faq';
import {LinkButton} from '@shadcn/button/button';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {MessagesSquareIcon} from 'lucide-react';
import {useState} from 'react';
import {StaticPageTitle} from '../../seo/static-page-title';
import {Footer} from '../../ui/footer/footer';
import {Header} from '../../ui/landing-page/header/header';
import {BillingCycleRadio} from './billing-cycle-radio';
import {UpsellBillingCycle} from './find-best-price';

export function Component() {
  const query = useSuspenseQuery(listProductsForPricingPageOptions());
  const [selectedCycle, setSelectedCycle] =
    useState<UpsellBillingCycle>('yearly');
  return (
    <>
      <StaticPageTitle>
        <Trans message="Pricing" />
      </StaticPageTitle>

      <Header />

      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl pt-12 text-center md:pt-20">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            <Trans message="Choose the right plan for you" />
          </h1>
          <p className="mt-3 text-base text-muted-foreground">
            <Trans message="Start for free, then upgrade when you're ready to grow." />
          </p>
        </div>

        <BillingCycleRadio
          products={query.data?.data}
          selectedCycle={selectedCycle}
          onChange={setSelectedCycle}
          className="my-8 md:mb-12"
        />

        <PricingTable
          selectedCycle={selectedCycle}
          products={query.data?.data}
        />

        <ContactSection />
      </main>

      <Footer className="mx-auto max-w-6xl shrink-0 px-6" />
    </>
  );
}

function ContactSection() {
  const query = useSuspenseQuery(listProductsForPricingPageOptions());

  if (query.data?.faq) {
    return (
      <LandingPageFaq
        config={query.data.faq as unknown as LandingPageFaqConfig}
      />
    );
  }

  return (
    <>
      <div className="my-5 flex flex-col items-center gap-2 p-6 md:my-20">
        <MessagesSquareIcon className="size-9 text-muted-foreground" />
        <div className="md:text-lg">
          <Trans message="Do you have any questions about PRO accounts?" />
        </div>
        <div className="my-5 text-sm md:mt-0 md:text-base">
          <Trans message="Our support team will be happy to assist you." />
        </div>
        <LinkButton variant="default" color="primary" to="/contact" size="lg">
          <Trans message="Contact us" />
        </LinkButton>
      </div>
    </>
  );
}

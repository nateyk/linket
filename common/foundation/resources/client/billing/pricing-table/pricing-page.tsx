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
import {Navbar} from '../../ui/navigation/navbar/navbar';
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

      <Navbar.Root className="border-b">
        <Navbar.Logo />
        <Navbar.Menu position="pricing-table-page" />
        <Navbar.Content className="ml-auto">
          <Navbar.AuthContent />
        </Navbar.Content>
      </Navbar.Root>

      <main className="mx-auto max-w-6xl px-6">
        <h1 className="mt-7.5 mb-7.5 text-center text-3xl font-normal md:mt-15 md:text-4xl md:font-medium">
          <Trans message="Choose the right plan for you" />
        </h1>

        <BillingCycleRadio
          products={query.data?.data}
          selectedCycle={selectedCycle}
          onChange={setSelectedCycle}
          className="mb-10 flex justify-center md:mb-17.5"
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

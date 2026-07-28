import {getAccountSettingsOptions} from '@common/auth/ui/account-settings/account-settings-queries';
import {BillingPageBreadcrumb} from '@common/billing/billing-page/billing-page-breadcrumb';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {Fragment} from 'react';
import {Outlet} from 'react-router';
import {StaticPageTitle} from '../../seo/static-page-title';
import {Footer} from '../../ui/footer/footer';
import {Navbar} from '../../ui/navigation/navbar/navbar';

export function Component() {
  const query = useSuspenseQuery(getAccountSettingsOptions());
  return (
    <Fragment>
      <StaticPageTitle>
        <Trans message="Billing" />
      </StaticPageTitle>
      <div className="flex min-h-screen flex-col">
        <Navbar.Root className="border-b">
          <Navbar.Logo />
          <Navbar.Menu position="billing-page" />
          <Navbar.Content className="ml-auto">
            <Navbar.AuthContent />
          </Navbar.Content>
        </Navbar.Root>

        <div className="mx-auto my-11 w-full max-w-6xl flex-auto px-6">
          <BillingPageBreadcrumb hideOnIndexRoute />
          <Outlet context={query.data.data} />
        </div>
        <Footer className="mx-auto mt-auto w-full max-w-6xl px-6" />
      </div>
    </Fragment>
  );
}

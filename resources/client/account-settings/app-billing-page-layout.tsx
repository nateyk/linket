import {AccountSettingsPageLayout} from '@app/account-settings/account-settings-page-layout';
import {getAccountSettingsOptions} from '@common/auth/ui/account-settings/account-settings-queries';
import {BillingPageBreadcrumb} from '@common/billing/billing-page/billing-page-breadcrumb';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Outlet} from 'react-router';

export function Component() {
  const query = useSuspenseQuery(getAccountSettingsOptions());
  return (
    <AccountSettingsPageLayout
      title={<BillingPageBreadcrumb className="text-xl" />}
    >
      <Outlet context={query.data.data} />
    </AccountSettingsPageLayout>
  );
}

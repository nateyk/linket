import {UsageGrid} from '@app/dashboard/layout/sidenav/usage-dialog';
import {Component as CommonBillingPage} from '@common/billing/billing-page/billing-page';
import {BillingPlanPanel} from '@common/billing/billing-page/billing-plan-panel';
import {Trans} from '@ui/i18n/trans';

export function Component() {
  return (
    <div className="flex flex-col gap-6">
      <CommonBillingPage>
        <BillingUsageGrid />
      </CommonBillingPage>
    </div>
  );
}

function BillingUsageGrid() {
  return (
    <BillingPlanPanel title={<Trans message="Usage" />}>
      <UsageGrid />
    </BillingPlanPanel>
  );
}

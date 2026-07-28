import {User} from '@app/gen/schemas/user';
import {ActiveTrialBanner} from '@common/billing/billing-page/active-trial-banner';
import {FreePlanPanel} from '@common/billing/billing-page/panels/free-plan-panel';
import {ReactNode} from 'react';
import {useOutletContext} from 'react-router';
import {ActivePlanPanel} from './panels/active-plan-panel';
import {CancelledPlanPanel} from './panels/cancelled-plan-panel';
import {InvoiceHistoryPanel} from './panels/invoice-history-panel';
import {PaymentMethodPanel} from './panels/payment-method-panel';

export function Component({children}: {children?: ReactNode}) {
  const data = useOutletContext<User>();

  const planPanel = !data.subscription ? (
    <FreePlanPanel />
  ) : data.subscription.ends_at ? (
    <CancelledPlanPanel />
  ) : (
    <ActivePlanPanel />
  );

  return (
    <div className="mt-8">
      <ActiveTrialBanner className="mb-11" />
      {planPanel}
      {children}
      <PaymentMethodPanel />
      <InvoiceHistoryPanel />
    </div>
  );
}

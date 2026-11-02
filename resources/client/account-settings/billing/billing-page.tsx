import {User} from '@app/gen/schemas/user';
import {UsageGrid} from '@app/dashboard/layout/sidenav/usage-dialog';
import {ActiveTrialBanner} from '@common/billing/billing-page/active-trial-banner';
import {ActivePlanPanel} from '@common/billing/billing-page/panels/active-plan-panel';
import {CancelledPlanPanel} from '@common/billing/billing-page/panels/cancelled-plan-panel';
import {FreePlanPanel} from '@common/billing/billing-page/panels/free-plan-panel';
import {InvoiceHistoryPanel} from '@common/billing/billing-page/panels/invoice-history-panel';
import {LinkButton} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {CircleHelpIcon} from 'lucide-react';
import {useOutletContext} from 'react-router';
import {SubscriptionBillingHistory} from './subscription-billing-history';

export function Component() {
  const data = useOutletContext<User>();

  const planPanel = !data.subscription ? (
    <FreePlanPanel />
  ) : data.subscription.ends_at ? (
    <CancelledPlanPanel />
  ) : (
    <ActivePlanPanel />
  );

  return (
    <div className="flex min-w-0 flex-col gap-5 pb-6">
      <section
        aria-labelledby="billing-overview-title"
        className="flex flex-col gap-4 rounded-card-sm border bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
      >
        <div className="max-w-2xl">
          <h2
            id="billing-overview-title"
            className="text-xl font-semibold tracking-tight"
          >
            <Trans message="Billing overview" />
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <Trans message="Manage your plan, usage, and verified Pro payments in one place." />
          </p>
        </div>
        <nav
          aria-label="Billing actions"
          className="flex flex-wrap items-center gap-2"
        >
          <LinkButton to="/help" variant="ghost" size="sm">
            <CircleHelpIcon aria-hidden="true" />
            <Trans message="Billing help" />
          </LinkButton>
          <LinkButton to="/pricing" variant="default" color="primary" size="sm">
            <Trans message="View Pro" />
          </LinkButton>
        </nav>
      </section>

      <ActiveTrialBanner />

      <section
        aria-label="Current plan"
        className="rounded-card-sm border bg-card p-5 sm:p-6 [&>div]:mb-0"
      >
        {planPanel}
      </section>

      <section
        aria-labelledby="billing-usage-title"
        className="rounded-card-sm border bg-card p-5 sm:p-6"
      >
        <header className="mb-5 border-b pb-4">
          <h2 id="billing-usage-title" className="text-base font-medium">
            <Trans message="Usage" />
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            <Trans message="Current account limits and activity." />
          </p>
        </header>
        <UsageGrid />
      </section>

      <SubscriptionBillingHistory />

      <section
        aria-label="Invoices"
        className="rounded-card-sm border bg-card p-5 sm:p-6 [&>div]:mb-0"
      >
        <InvoiceHistoryPanel />
      </section>
    </div>
  );
}

import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {CreditCardIcon} from 'lucide-react';
import {Link} from 'react-router';
import {ReconciliationAuditTab} from './admin-financial-settings-page';

export function Component() {
  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <div className="min-w-0 flex-1">
          <DashboardLayout.SectionTitle>
            <Trans message="Ledger audit & reconciliation" />
          </DashboardLayout.SectionTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <Trans message="Verify double-entry balance, clearing accounts, creator liabilities, and run ledger reconciliation." />
          </p>
        </div>
        <Button
          variant="outline"
          className="hidden sm:inline-flex"
          render={<Link to="/admin/withdrawals" />}
        >
          <CreditCardIcon />
          <Trans message="Withdrawals dashboard" />
        </Button>
      </DashboardLayout.SectionHeader>

      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5">
          <ReconciliationAuditTab />
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

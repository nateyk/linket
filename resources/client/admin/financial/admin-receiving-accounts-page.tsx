import {AdminReceivingAccountsPanel} from '@app/admin/digital-products/admin-receiving-accounts-panel';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {Link} from 'react-router';

export function Component() {
  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Receiving accounts" />
        </DashboardLayout.SectionTitle>
        <Button
          variant="outline"
          size="sm"
          className="ms-auto hidden shrink-0 sm:inline-flex"
          nativeButton={false}
          render={<Link to="/admin/financial/withdrawal-methods/legacy" />}
        >
          <Trans message="Legacy payout methods" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-5">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <p className="text-sm text-muted-foreground">
              <Trans message="Review creator bank and wallet accounts for ownership, Verify.et registration, and checkout eligibility. Legacy creator withdrawal destinations stay on Legacy payout methods." />
            </p>
            <Button
              variant="outline"
              size="sm"
              className="inline-flex shrink-0 sm:hidden"
              nativeButton={false}
              render={<Link to="/admin/financial/withdrawal-methods/legacy" />}
            >
              <Trans message="Legacy payout methods" />
            </Button>
          </div>
          <AdminReceivingAccountsPanel />
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

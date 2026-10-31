import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Trans} from '@ui/i18n/trans';
import {useEffect} from 'react';
import {useNavigate, useSearchParams} from 'react-router';
import {VerifyEtMethodCatalog} from './verify-et-method-catalog';

export function Component() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const legacyReview =
    searchParams.get('tab') === 'reviews' ||
    searchParams.has('search') ||
    searchParams.has('lifecycle');

  useEffect(() => {
    if (!legacyReview) {
      return;
    }
    const next = new URLSearchParams();
    const search = searchParams.get('search');
    const lifecycle = searchParams.get('lifecycle');
    if (search) {
      next.set('search', search);
    }
    if (lifecycle) {
      next.set('lifecycle', lifecycle);
    }
    navigate(`/admin/financial/withdrawal-methods?${next.toString()}`, {replace: true});
  }, [legacyReview, navigate, searchParams]);

  if (legacyReview) {
    return null;
  }

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <Trans message="Payment gateways" />
        </DashboardLayout.SectionTitle>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-4 py-5">
          <p className="mb-4 text-sm text-muted-foreground">
            <Trans message="Enable, disable, and suspend the banks and wallets creators can offer at checkout. Review creator receiving accounts under Receiving accounts." />
          </p>
          <VerifyEtMethodCatalog />
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

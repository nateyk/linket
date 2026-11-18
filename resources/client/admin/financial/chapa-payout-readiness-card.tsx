import {apiClient} from '@common/http/query-client';
import {Badge} from '@shadcn/badge/badge';
import {Trans} from '@ui/i18n/trans';
import {useEffect, useState} from 'react';

type Readiness = {
  mode: 'test' | 'live' | 'unconfigured';
  enabled: boolean;
  approval_configured: boolean;
  test_only: boolean;
  approval_url: string;
  admin_step_up_required: boolean;
};

export function ChapaPayoutReadinessCard() {
  const [readiness, setReadiness] = useState<Readiness>();
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    apiClient.get('/api/v1/admin/financial/chapa-payout-readiness')
      .then(response => {
        if (mounted) setReadiness(response.data.data as Readiness);
      })
      .catch(() => {
        if (mounted) setError(true);
      });
    return () => { mounted = false; };
  }, []);

  return (
    <section aria-label="Transfer approval readiness" className="rounded-input border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold"><Trans message="Chapa transfer approval" /></h3>
        {readiness && (
          <Badge variant={readiness.enabled && readiness.approval_configured ? 'positive' : 'secondary'}>
            {readiness.enabled && readiness.approval_configured ? <Trans message="Ready to test" /> : <Trans message="Not ready" />}
          </Badge>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-sm text-destructive"><Trans message="Unable to load transfer approval readiness." /></p>}
      {readiness && (
        <div className="mt-3 space-y-2 text-sm">
          <p><Trans message="Merchant mode" />: <strong>{readiness.mode}</strong></p>
          <p><Trans message="Transfer approval secret" />: <strong>{readiness.approval_configured ? 'Configured' : 'Missing'}</strong></p>
          <p><Trans message="Admin password confirmation" />: <strong>{readiness.admin_step_up_required ? 'Required' : 'Optional — disabled'}</strong></p>
          <p className="text-muted-foreground"><Trans message="Register this URL in Chapa Transfer Approval settings:" /></p>
          <code className="block break-all rounded-input bg-muted p-2 text-xs">{readiness.approval_url}</code>
          <p className="text-xs text-muted-foreground">
            <Trans message="This page never displays the approval secret. A ready status does not prove Chapa callback acceptance or authorize live payouts." />
          </p>
        </div>
      )}
    </section>
  );
}

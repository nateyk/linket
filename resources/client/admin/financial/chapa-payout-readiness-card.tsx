import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Trans} from '@ui/i18n/trans';
import {useEffect, useState} from 'react';

type Readiness = {
  mode: 'test' | 'live' | 'unconfigured';
  enabled: boolean;
  approval_configured: boolean;
  webhook_configured: boolean;
  test_only: boolean;
  approval_url: string;
  admin_step_up_required: boolean;
};

const readinessUrl = '/api/v1/admin/financial/chapa-payout-readiness';
const credentialsUrl = '/api/v1/admin/billing/subscription-gateway';

export function ChapaPayoutReadinessCard() {
  const [readiness, setReadiness] = useState<Readiness>();
  const [approvalSecret, setApprovalSecret] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    apiClient.get(readinessUrl)
      .then(response => { if (active) setReadiness(response.data.data as Readiness); })
      .catch(() => { if (active) setError('Unable to load transfer approval readiness.'); });
    return () => { active = false; };
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!readiness || readiness.mode === 'unconfigured') return;
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await apiClient.put(credentialsUrl, {transfer_approval_secret: approvalSecret});
      setApprovalSecret('');
      const response = await apiClient.get(readinessUrl);
      setReadiness(response.data.data as Readiness);
      setMessage('Transfer approval secret saved securely for the active merchant environment.');
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  const canSave = !saving && readiness?.mode !== 'unconfigured'
    && approvalSecret.length >= 16 && approvalSecret.length <= 255
    && approvalSecret.trim() === approvalSecret;

  return (
    <section aria-label="Chapa transfer approval" className="min-w-0 rounded-input border border-border p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold"><Trans message="Chapa transfer approval" /></h3>
        {readiness && (
          <Badge variant={readiness.enabled && readiness.approval_configured ? 'positive' : 'secondary'}>
            {readiness.enabled && readiness.approval_configured ? <Trans message="Transfer setup ready for testing" /> : <Trans message="Not ready" />}
          </Badge>
        )}
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="mt-3 text-sm text-positive">{message}</p>}
      {readiness && (
        <div className="mt-3 space-y-3 text-sm">
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div><dt className="text-muted-foreground"><Trans message="Merchant mode" /></dt><dd className="font-medium uppercase">{readiness.mode}</dd></div>
            <div><dt className="text-muted-foreground"><Trans message="Transfer approval secret" /></dt><dd className="font-medium">{readiness.approval_configured ? 'Configured' : 'Missing'}</dd></div>
            <div><dt className="text-muted-foreground"><Trans message="Payment webhook signing" /></dt><dd className="font-medium">{readiness.webhook_configured ? 'Configured' : 'Missing'}</dd></div>
            <div><dt className="text-muted-foreground"><Trans message="Admin password confirmation" /></dt><dd className="font-medium">{readiness.admin_step_up_required ? 'Required' : 'Optional — disabled'}</dd></div>
          </dl>
          <div className="space-y-1">
            <p className="text-muted-foreground"><Trans message="Register this URL in Chapa Transfer Approval settings:" /></p>
            <code className="block min-w-0 break-all rounded-input bg-muted p-2 text-xs">{readiness.approval_url}</code>
          </div>
          <form onSubmit={handleSave} className="space-y-3 border-t border-border pt-3">
            <Field.Root>
              <Field.Label htmlFor="chapa-approval-secret">
                <Trans message="Set or rotate transfer approval secret" />
              </Field.Label>
              <Input
                id="chapa-approval-secret"
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                value={approvalSecret}
                onChange={event => setApprovalSecret(event.target.value)}
                placeholder={readiness.approval_configured ? '••••••••••••••••' : 'Enter secret from Chapa dashboard'}
              />
              <Field.Description>
                <Trans message="Separate from the merchant key and webhook secret. Save the same value configured in Chapa Transfer Approval settings. At least 16 characters; existing secrets are never displayed." />
              </Field.Description>
            </Field.Root>
            <Button type="submit" size="sm" disabled={!canSave} className="max-sm:w-full">
              <Trans message="Save transfer approval secret" />
            </Button>
          </form>
          {readiness.mode === 'live' && (
            <p className="text-xs text-muted-foreground">
              <Trans message="LIVE transfers require independent merchant approval and the separate server payout switch. Saving a secret does not enable live payouts." />
            </p>
          )}
          {readiness.mode === 'test' && (
            <p className="text-xs text-muted-foreground">
              <Trans message="TEST transfers still require verified callbacks, provider balance and settlement evidence. No real funds are moved with TEST credentials." />
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            <Trans message="A configured status does not confirm Chapa callback acceptance or verified payout settlement." />
          </p>
        </div>
      )}
    </section>
  );
}

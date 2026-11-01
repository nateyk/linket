import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Switch} from '@shadcn/forms/switch/switch';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {useCallback, useEffect, useState, type FormEvent} from 'react';

type Settings = {
  enabled: boolean;
  api_key_configured: boolean;
  webhook_secret_configured: boolean;
  webhook_url: string;
  alert_email: string | null;
  mock_enabled: boolean;
};

export function VerifyEtSettingsPanel() {
  const [settings, setSettings] = useState<Settings>();
  const [apiKey, setApiKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setError(undefined);
    try {
      const response = await apiClient.get('/api/v1/admin/storefront/verify-et-settings');
      setSettings(response.data.data);
    } catch (reason) {
      setError(getApiErrorMessage(reason) || 'Unable to load Verify.et settings.');
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!settings) return;
    setBusy(true);
    setSaved(false);
    setError(undefined);
    try {
      const response = await apiClient.patch('/api/v1/admin/storefront/verify-et-settings', {
        enabled: settings.enabled,
        alert_email: settings.alert_email || null,
        ...(apiKey ? {api_key: apiKey} : {}),
        ...(webhookSecret ? {webhook_secret: webhookSecret} : {}),
      });
      setSettings(response.data.data);
      setApiKey('');
      setWebhookSecret('');
      setSaved(true);
    } catch (reason) {
      setError(getApiErrorMessage(reason) || 'Unable to save Verify.et settings.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title><Trans message="Verify.et connection" /></Card.Title>
        <Card.Description><Trans message="Manage payment verification and credentials here. Bank and wallet controls below apply in addition to this switch." /></Card.Description>
      </Card.Header>
      <Card.Content>
        {!settings && !error && <Spinner />}
        {error && <p role="alert" className="mb-4 text-sm text-destructive"><Trans message={error} /></p>}
        {!settings && error && <Button variant="outline" onClick={() => void load()}><Trans message="Retry" /></Button>}
        {settings && (
          <form onSubmit={save} onChange={() => setSaved(false)} className="flex flex-col gap-5">
            <Field.Group>
              <Field.Root orientation="horizontal">
                <Field.Label htmlFor="verify-et-enabled"><Trans message="Enable payment verification" /></Field.Label>
                <Switch id="verify-et-enabled" checked={settings.enabled} disabled={busy} onCheckedChange={enabled => { setSettings({...settings, enabled}); setSaved(false); }} />
              </Field.Root>
              <p className="text-sm text-muted-foreground"><Trans message="Turning this off pauses new paid purchases. Approved receiving accounts stay approved." /></p>
              {settings.mock_enabled && <p role="status" className="text-sm text-warning"><Trans message="Mock mode is configured on this server. This page does not enable or disable mock verification." /></p>}
              <div className="grid gap-5 md:grid-cols-2">
                <Field.Root>
                  <Field.Label htmlFor="verify-et-api-key"><Trans message="API key" /></Field.Label>
                  <Input id="verify-et-api-key" type="password" autoComplete="new-password" value={apiKey} disabled={busy} onChange={e => setApiKey(e.target.value)} />
                  <Field.Description>{settings.api_key_configured ? <Trans message="API key configured. Leave blank to keep it." /> : <Trans message="Add your Verify.et API key." />}</Field.Description>
                </Field.Root>
                <Field.Root>
                  <Field.Label htmlFor="verify-et-webhook-secret"><Trans message="Webhook signing secret" /></Field.Label>
                  <Input id="verify-et-webhook-secret" type="password" autoComplete="new-password" value={webhookSecret} disabled={busy} onChange={e => setWebhookSecret(e.target.value)} />
                  <Field.Description>{settings.webhook_secret_configured ? <Trans message="Signing secret configured. Leave blank to keep it." /> : <Trans message="Paste the signing secret provided by Verify.et." />}</Field.Description>
                </Field.Root>
              </div>
              <Field.Root>
                <Field.Label htmlFor="verify-et-webhook-url"><Trans message="Webhook URL" /></Field.Label>
                <Input id="verify-et-webhook-url" readOnly value={settings.webhook_url} />
                <Field.Description><Trans message="Register this URL in Verify.et under API Keys → Webhooks, save its signing secret here, then send a test from Verify.et and confirm the endpoint is active. Saving credentials does not verify the connection." /></Field.Description>
              </Field.Root>
              <Field.Root>
                <Field.Label htmlFor="verify-et-alert-email"><Trans message="Payment alert email" /></Field.Label>
                <Input id="verify-et-alert-email" type="email" value={settings.alert_email ?? ''} disabled={busy} onChange={e => setSettings({...settings, alert_email: e.target.value})} />
                <Field.Description><Trans message="Receive payment verification alerts at this address." /></Field.Description>
              </Field.Root>
            </Field.Group>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={busy}>{busy && <Spinner />}<Trans message="Save Verify.et settings" /></Button>
              {saved && <p role="status" className="text-sm text-muted-foreground"><Trans message="Verify.et settings saved." /></p>}
            </div>
          </form>
        )}
      </Card.Content>
    </Card.Root>
  );
}

import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Spinner} from '@shadcn/spinner/spinner';
import {Toggle} from '@shadcn/toggle';
import {ToggleGroup} from '@shadcn/toggle-group/toggle-group';
import {Trans} from '@ui/i18n/trans';
import {useCallback, useEffect, useState} from 'react';

type Gateway = 'verify_et' | 'chapa';

function canSaveChapaSettings(publicKey: string, secretKey: string, webhookSecret: string): boolean {
  const hasPublic = publicKey.trim() !== '';
  const hasSecret = secretKey.trim() !== '';
  const hasWebhook = webhookSecret.trim() !== '';
  if (hasPublic !== hasSecret) {
    return false;
  }

  return (hasPublic && hasSecret) || hasWebhook;
}

function readSettings(data: Partial<GatewaySettings> | undefined): GatewaySettings {
  return {
    gateway: data?.gateway === 'chapa' ? 'chapa' : 'verify_et',
    secret_configured: data?.secret_configured === true,
    public_key_masked: typeof data?.public_key_masked === 'string' ? data.public_key_masked : null,
    webhook_secret_configured: data?.webhook_secret_configured === true,
    webhook_url: typeof data?.webhook_url === 'string' ? data.webhook_url : null,
  };
}

type GatewaySettings = {
  gateway: Gateway;
  secret_configured: boolean;
  public_key_masked: string | null;
  webhook_secret_configured: boolean;
  webhook_url: string | null;
};

export function SubscriptionGatewayCard() {
  const [gateway, setGateway] = useState<Gateway>('verify_et');
  const [settings, setSettings] = useState<GatewaySettings>();
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [rejected, setRejected] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/v1/admin/billing/subscription-gateway');
      const next = readSettings(response.data.data);
      setSettings(next);
      setGateway(next.gateway);
      setError(undefined);
    } catch (reason) {
      setError(getApiErrorMessage(reason) || 'Unable to load the subscription payment setting.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (next: Gateway) => {
    setGateway(next);
    setBusy(true);
    setSaved(false);
    setError(undefined);
    try {
      const response = await apiClient.put('/api/v1/admin/billing/subscription-gateway', {gateway: next});
      const savedSettings = readSettings(response.data.data);
      setSettings(savedSettings);
      setGateway(savedSettings.gateway);
      setSaved(true);
    } catch (reason) {
      setError(getApiErrorMessage(reason) || 'Unable to save the subscription payment setting.');
      await load();
    } finally {
      setBusy(false);
    }
  };

  const saveKeys = async () => {
    if (!canSaveChapaSettings(publicKey, secretKey, webhookSecret)) {
      return;
    }
    setBusy(true);
    setSaved(false);
    setError(undefined);
    setRejected(false);
    try {
      const response = await apiClient.put('/api/v1/admin/billing/subscription-gateway', {
        gateway,
        ...(publicKey.trim() !== '' && secretKey !== ''
          ? {public_key: publicKey.trim(), secret_key: secretKey}
          : {}),
        ...(webhookSecret.trim() !== '' ? {webhook_secret: webhookSecret.trim()} : {}),
      });
      setSettings(readSettings(response.data.data));
      setPublicKey('');
      setSecretKey('');
      setWebhookSecret('');
      setSaved(true);
    } catch (reason) {
      const status = (reason as {response?: {status?: number}}).response?.status;
      if (status === 422) {
        setRejected(true);
      } else {
        setError(getApiErrorMessage(reason) || 'Unable to save the Chapa keys.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>
          <Trans message="Pro subscription payments" />
        </Card.Title>
        <Card.Description>
          <Trans message="Choose how sellers upgrade to Pro. This is separate from storefront receiving accounts. Verify.et and Chapa both stay available to switch." />
        </Card.Description>
      </Card.Header>
      <Card.Content className="flex flex-col gap-4">
        {loading && <Spinner />}
        {rejected && (
          <p role="alert" className="text-sm text-destructive">
            <Trans message="Chapa did not accept this secret key." />
          </p>
        )}
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {!loading && (
          <ToggleGroup variant="segmented" value={[gateway]} disabled={busy}>
            <Toggle value="verify_et" disabled={busy} onClick={() => void save('verify_et')}>
              <Trans message="Verify.et" />
            </Toggle>
            <Toggle value="chapa" disabled={busy} onClick={() => void save('chapa')}>
              <Trans message="Chapa" />
            </Toggle>
          </ToggleGroup>
        )}
        {!loading && (
          <form
            className="flex flex-col gap-4"
            onSubmit={event => {
              event.preventDefault();
              void saveKeys();
            }}
          >
            <Field.Root>
              <Field.Label htmlFor="platform-chapa-public-key">
                <Trans message="Public key" />
              </Field.Label>
              <Input
                id="platform-chapa-public-key"
                bindToHookForm={false}
                autoComplete="off"
                value={publicKey}
                disabled={busy}
                onChange={event => setPublicKey(event.target.value)}
              />
              {settings?.public_key_masked && (
                <Field.Description>{settings.public_key_masked}</Field.Description>
              )}
            </Field.Root>
            <Field.Root>
              <Field.Label htmlFor="platform-chapa-secret-key">
                <Trans message="Secret key" />
              </Field.Label>
              <Input
                id="platform-chapa-secret-key"
                bindToHookForm={false}
                type="password"
                autoComplete="new-password"
                value={secretKey}
                disabled={busy}
                onChange={event => setSecretKey(event.target.value)}
              />
              <Field.Description>
                {settings?.secret_configured ? (
                  <Trans message="A secret key is stored. Enter a new one to replace it." />
                ) : (
                  <Trans message="This key charges Pro upgrades. It is not shown again." />
                )}
              </Field.Description>
            </Field.Root>
            <Field.Root>
              <Field.Label htmlFor="platform-chapa-webhook-secret">
                <Trans message="Webhook signing secret" />
              </Field.Label>
              <Input
                id="platform-chapa-webhook-secret"
                bindToHookForm={false}
                type="password"
                autoComplete="new-password"
                value={webhookSecret}
                disabled={busy}
                onChange={event => setWebhookSecret(event.target.value)}
              />
              <Field.Description>
                {settings?.webhook_secret_configured ? (
                  <Trans message="A webhook signing secret is stored. Enter a new one to replace it." />
                ) : (
                  <Trans message="Paste the signing secret from the Chapa dashboard." />
                )}
              </Field.Description>
            </Field.Root>
            {settings?.webhook_url && (
              <Field.Root>
                <Field.Label htmlFor="platform-chapa-webhook-url">
                  <Trans message="Webhook URL" />
                </Field.Label>
                <Input
                  id="platform-chapa-webhook-url"
                  bindToHookForm={false}
                  readOnly
                  value={settings.webhook_url}
                />
                <Field.Description>
                  <Trans message="Register this URL in the Chapa dashboard so a paid Pro upgrade is confirmed even if the browser does not return to Linket." />
                </Field.Description>
              </Field.Root>
            )}
            <div>
              <Button type="submit" disabled={busy || !canSaveChapaSettings(publicKey, secretKey, webhookSecret)}>
                <Trans message="Save Chapa keys" />
              </Button>
            </div>
          </form>
        )}
        {saved && (
          <p role="status" className="text-sm text-muted-foreground">
            <Trans message="Pro subscription payment setting saved." />
          </p>
        )}
        {error && !loading && (
          <Button variant="outline" onClick={() => void load()}>
            <Trans message="Retry" />
          </Button>
        )}
      </Card.Content>
    </Card.Root>
  );
}

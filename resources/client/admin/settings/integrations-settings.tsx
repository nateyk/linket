import {SettingsPanel} from '@common/admin/settings/layout/settings-panel';
import {apiClient} from '@common/http/query-client';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Input} from '@shadcn/forms/input/input';
import {Switch} from '@shadcn/forms/switch/switch';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {
  RefreshCwIcon,
  SendIcon,
  WebhookIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';

type WebhookState = {
  url: string;
  pending_update_count: number;
  allowed_updates: string[];
  last_error_date?: number | null;
  last_synchronization_error_date?: number | null;
  url_matches?: boolean;
  updates_match?: boolean;
};

type LiveBot = {
  id: number | null;
  username: string;
  identity_matches: boolean;
};

type TelegramHealth = {
  enabled: boolean;
  ready: boolean;
  bot_token_configured: boolean;
  webhook_secret_configured: boolean;
  bot_username_configured: boolean;
  bot_username: string;
  webhook_url: string;
  connected_accounts: number;
  notification_enabled_accounts: number;
  link_token_ttl_minutes: number;
  http_timeout: number;
  http_connect_timeout: number;
  current_admin_connected: boolean;
  webhook?: WebhookState;
  bot?: LiveBot;
  status?: 'healthy' | 'degraded';
  test_sent?: boolean;
};

export function Component() {
  const [telegram, setTelegram] = useState<TelegramHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'sync' | 'test' | 'refresh' | 'inspect' | 'save' | null>(null);
  const [error, setError] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [botUsername, setBotUsername] = useState('');
  const [botToken, setBotToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');

  const load = useCallback(async () => {
    setBusy('refresh');
    setError(false);
    try {
      const response = await apiClient.get('/api/v1/admin/integrations/telegram');
      setTelegram(response.data.telegram);
      setEnabled(response.data.telegram.enabled);
      setBotUsername(response.data.telegram.bot_username || '');
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setBusy(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveConfiguration = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy('save');
    setError(false);
    setConfigSaved(false);
    setSyncSuccess(false);
    setTestSuccess(false);
    try {
      const response = await apiClient.patch('/api/v1/admin/integrations/telegram', {
        enabled,
        ...(botUsername.trim() ? {bot_username: botUsername.trim().replace(/^@/, '')} : {}),
        ...(botToken ? {token: botToken} : {}),
        ...(webhookSecret ? {webhook_secret: webhookSecret} : {}),
      });
      setTelegram(response.data.telegram);
      setBotUsername(response.data.telegram.bot_username || '');
      setBotToken('');
      setWebhookSecret('');
      setConfigSaved(true);
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  };

  const inspect = async () => {
    setBusy('inspect');
    setError(false);
    try {
      const response = await apiClient.get('/api/v1/admin/integrations/telegram/health');
      setTelegram(response.data.telegram);
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  };

  const syncWebhook = async () => {
    setBusy('sync');
    setError(false);
    setSyncSuccess(false);
    try {
      const response = await apiClient.post(
        '/api/v1/admin/integrations/telegram/webhook/sync',
      );
      setTelegram(response.data.telegram);
      setSyncSuccess(true);
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  };

  const sendTest = async () => {
    setBusy('test');
    setError(false);
    setTestSuccess(false);
    try {
      const response = await apiClient.post(
        '/api/v1/admin/integrations/telegram/test',
      );
      setTelegram(response.data.telegram);
      setTestSuccess(true);
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  };

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <DashboardLayout.SectionTitle>
          <h1>
            <Trans message="Integrations" />
          </h1>
        </DashboardLayout.SectionTitle>
      </DashboardLayout.SectionHeader>

      <div className="flex-auto overflow-y-auto">
        <div className="@container/settings-form mx-auto w-full p-3 md:p-6 lg:max-w-360">
          <SettingsPanel
            title={
              <span className="flex items-center gap-2">
                <SendIcon className="size-4" />
                <Trans message="Telegram" />
              </span>
            }
            description={
              <Trans message="Configure Telegram notifications and keep the bot webhook synchronized." />
            }
            layout="vertical"
          >
            {loading ? (
              <div className="flex min-h-36 items-center justify-center">
                <Spinner />
              </div>
            ) : error && !telegram ? (
              <div className="space-y-3">
                <p role="alert" className="text-sm text-destructive">
                  <Trans message="Unable to load Telegram integration status. Try again." />
                </p>
                <Button variant="outline" onClick={() => void load()}>
                  <RefreshCwIcon />
                  <Trans message="Try again" />
                </Button>
              </div>
            ) : telegram ? (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={telegram.ready ? 'positive' : 'secondary'}>
                    {telegram.ready ? (
                      <Trans message="Ready" />
                    ) : (
                      <Trans message="Needs setup" />
                    )}
                  </Badge>
                  {telegram.enabled ? (
                    <Badge variant="outline">
                      <Trans message="Enabled" />
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Trans message="Disabled" />
                    </Badge>
                  )}
                </div>

                <form onSubmit={event => void saveConfiguration(event)} className="space-y-4 rounded-card-sm border p-4">
                  <div>
                    <p className="text-sm font-semibold"><Trans message="Configure Telegram" /></p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <Trans message="Credentials are stored securely and cannot be viewed after saving. Leave a secret blank to keep its current value." />
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <label htmlFor="telegram-enabled" className="text-sm font-medium"><Trans message="Enable Telegram" /></label>
                    <Switch id="telegram-enabled" checked={enabled} onCheckedChange={setEnabled} disabled={busy !== null} />
                  </div>
                  <div>
                    <label htmlFor="telegram-bot-username" className="mb-1.5 block text-sm font-medium"><Trans message="Bot username" /></label>
                    <Input bindToHookForm={false} id="telegram-bot-username" value={botUsername}
                      onChange={event => setBotUsername(event.target.value)} disabled={busy !== null} autoComplete="off" />
                  </div>
                  <div>
                    <label htmlFor="telegram-bot-token" className="mb-1.5 block text-sm font-medium"><Trans message="Bot token" /></label>
                    <Input bindToHookForm={false} id="telegram-bot-token" type="password" value={botToken}
                      onChange={event => setBotToken(event.target.value)} disabled={busy !== null} autoComplete="new-password" />
                  </div>
                  <div>
                    <label htmlFor="telegram-webhook-secret" className="mb-1.5 block text-sm font-medium"><Trans message="Webhook secret" /></label>
                    <Input bindToHookForm={false} id="telegram-webhook-secret" type="password" value={webhookSecret}
                      onChange={event => setWebhookSecret(event.target.value)} disabled={busy !== null} autoComplete="new-password" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Trans message="After changing credentials, sync the webhook. A secret change may interrupt incoming updates until synchronization succeeds." />
                  </p>
                  {configSaved ? <p role="status" className="text-sm text-positive"><Trans message="Telegram settings saved. Sync the webhook to apply changes." /></p> : null}
                  <Button type="submit" disabled={busy !== null}><Trans message="Save Telegram settings" /></Button>
                </form>

                <div className="grid gap-3 sm:grid-cols-2">
                  <StatusItem
                    label="Bot token"
                    ready={telegram.bot_token_configured}
                  />
                  <StatusItem
                    label="Webhook secret"
                    ready={telegram.webhook_secret_configured}
                  />
                  <StatusItem
                    label="Bot username"
                    ready={telegram.bot_username_configured}
                    value={
                      telegram.bot_username
                        ? `@${telegram.bot_username}`
                        : undefined
                    }
                  />
                  <StatusItem
                    label="Creator connections"
                    ready
                    value={String(telegram.connected_accounts)}
                  />
                  <StatusItem
                    label="Notifications enabled"
                    ready
                    value={String(telegram.notification_enabled_accounts)}
                  />
                  <StatusItem
                    label="Link token lifetime"
                    ready
                    value={`${telegram.link_token_ttl_minutes} min`}
                  />
                </div>

                <div>
                  <label
                    htmlFor="telegram-webhook-url"
                    className="mb-1.5 block text-sm font-medium"
                  >
                    <Trans message="Webhook URL" />
                  </label>
                  <Input
                    bindToHookForm={false}
                    id="telegram-webhook-url"
                    value={telegram.webhook_url}
                    readOnly
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    <Trans message="The webhook signing secret is never displayed in Linket." />
                  </p>
                </div>

                {telegram.bot ? (
                  <div className="rounded-card-sm border p-4">
                    <p className="text-sm font-semibold"><Trans message="Live bot diagnostics" /></p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {telegram.bot.username ? `@${telegram.bot.username}` : '—'} ·{' '}
                      {telegram.bot.identity_matches ? <Trans message="Bot identity matches" /> : <Trans message="Bot identity mismatch" />}
                    </p>
                    <Badge variant={telegram.status === 'healthy' ? 'positive' : 'secondary'}>
                      {telegram.status === 'healthy' ? <Trans message="Healthy" /> : <Trans message="Degraded" />}
                    </Badge>
                  </div>
                ) : null}

                {telegram.webhook ? (
                  <div className="rounded-card-sm border p-4">
                    <div className="flex items-center gap-2">
                      <WebhookIcon className="size-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">
                        <Trans message="Webhook status" />
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {telegram.webhook.pending_update_count}{' '}
                      <Trans message="pending updates" />
                    </p>
                    {telegram.webhook.url_matches === false ? (
                      <p className="mt-1 text-sm text-destructive"><Trans message="Remote webhook URL mismatch" /></p>
                    ) : null}
                    {telegram.webhook.last_error_date ? (
                      <p className="mt-1 text-sm text-destructive"><Trans message="Telegram reported a recent webhook delivery error" /></p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">
                      <Trans message="Allowed updates:" />{' '}
                      {telegram.webhook.allowed_updates.join(', ') || '—'}
                    </p>
                  </div>
                ) : null}

                {syncSuccess ? (
                  <p role="status" className="text-sm text-positive">
                    <Trans message="Webhook synced" />
                  </p>
                ) : null}
                {testSuccess ? (
                  <p role="status" className="text-sm text-positive">
                    <Trans message="Test notification sent." />
                  </p>
                ) : null}
                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    <Trans message="Telegram operation failed. Check your settings and try again." />
                  </p>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2 border-t pt-5">
                  <Button
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() => void load()}
                  >
                    <RefreshCwIcon />
                    <Trans message="Refresh status" />
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!telegram.ready || busy !== null}
                    onClick={() => void inspect()}
                  >
                    <RefreshCwIcon />
                    <Trans message="Check Telegram health" />
                  </Button>
                  <Button
                    variant="outline"
                    disabled={!telegram.ready || busy !== null}
                    onClick={() => void syncWebhook()}
                  >
                    <WebhookIcon />
                    <Trans message="Sync webhook" />
                  </Button>
                  <Button
                    disabled={
                      !telegram.ready ||
                      !telegram.current_admin_connected ||
                      busy !== null
                    }
                    onClick={() => void sendTest()}
                  >
                    <SendIcon />
                    <Trans message="Send test notification" />
                  </Button>
                </div>

                {!telegram.current_admin_connected ? (
                  <p className="text-sm text-muted-foreground">
                    <Trans message="Connect Telegram to this admin account from Account Settings → Integrations before sending a test notification." />
                  </p>
                ) : null}
              </div>
            ) : null}
          </SettingsPanel>
        </div>
      </div>
    </DashboardLayout.MainSection>
  );
}

function StatusItem({
  label,
  ready,
  value,
}: {
  label: string;
  ready: boolean;
  value?: string;
}) {
  return (
    <div className="rounded-card-sm border p-3">
      <p className="text-xs font-medium text-muted-foreground">
        <Trans message={label} />
      </p>
      <div className="mt-1 flex items-center justify-between gap-3">
        <span className="truncate text-sm font-medium">
          {value ?? (ready ? <Trans message="Configured" /> : <Trans message="Missing" />)}
        </span>
        <Badge variant={ready ? 'positive' : 'secondary'}>
          {ready ? <Trans message="OK" /> : <Trans message="Needs setup" />}
        </Badge>
      </div>
    </div>
  );
}

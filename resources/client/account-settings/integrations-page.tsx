import {AccountSettingsPageLayout} from '@app/account-settings/account-settings-page-layout';
import {ChatGptIntegrationPanel} from '@app/account-settings/chatgpt-integration-panel';
import {AccountSettingsPanel} from '@common/auth/ui/account-settings/account-settings-panel';
import {apiClient} from '@common/http/query-client';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Switch} from '@shadcn/forms/switch/switch';
import {Spinner} from '@shadcn/spinner/spinner';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {
  ExternalLinkIcon,
  RefreshCwIcon,
  SendIcon,
  UnplugIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';

type PreferenceKey =
  | 'verified_sales'
  | 'service_inquiries'
  | 'product_moderation'
  | 'payment_disputes'
  | 'pro_billing'
  | 'receiving_accounts'
  | 'free_sales_quota'
  | 'payment_review';

type TelegramState = {
  enabled: boolean;
  connected: boolean;
  username: string | null;
  connected_at: string | null;
  last_seen_at: string | null;
  bot_username: string;
  notifications_enabled: boolean;
  delivery_status?: 'healthy' | 'attention_required' | 'unknown';
  last_delivery_at?: string | null;
  last_failed_at?: string | null;
  preferences: Record<PreferenceKey, boolean>;
};

const preferenceRows: {key: PreferenceKey; label: string; description: string}[] = [
  {
    key: 'verified_sales',
    label: 'Verified sales',
    description: 'Receive a Telegram notification after Linket verifies and completes a sale.',
  },
  {
    key: 'service_inquiries',
    label: 'Service inquiries',
    description: 'Know when a customer sends a new service inquiry.',
  },
  {
    key: 'product_moderation',
    label: 'Product moderation',
    description: 'Receive product approval, rejection and review updates.',
  },
  {
    key: 'payment_disputes',
    label: 'Payment disputes',
    description: 'Receive creator-side dispute status changes.',
  },
  {
    key: 'receiving_accounts',
    label: 'Receiving accounts',
    description: 'Know when Linket reviews, registers, suspends or restores a receiving account.',
  },
  {
    key: 'free_sales_quota',
    label: 'Free sales allowance',
    description: 'Receive milestone alerts as you approach your free verified-sale limit.',
  },
  {
    key: 'payment_review',
    label: 'Payment review',
    description: 'Know when a submitted buyer payment requires review in Linket.',
  },
  {
    key: 'pro_billing',
    label: 'Pro billing reminders',
    description: 'Receive Pro activation, renewal, past-due and expiry updates.',
  },
];

export function Component() {
  const [telegram, setTelegram] = useState<TelegramState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<'sent' | 'failed' | 'refresh_failed' | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const load = useCallback(async (silent = false): Promise<boolean> => {
    setError(false);
    try {
      const response = await apiClient.get('/api/v1/integrations/telegram');
      setTelegram(response.data.telegram);
      return true;
    } catch {
      if (!silent) setError(true);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const connect = async () => {
    setBusy(true);
    setError(false);
    try {
      const response = await apiClient.post(
        '/api/v1/integrations/telegram/connect',
      );
      const url = response.data.telegram.connect_url as string;
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const savePreferences = async (
    notificationsEnabled: boolean,
    preferences: TelegramState['preferences'],
  ) => {
    if (!telegram?.connected) return;

    const previous = telegram;
    setTelegram({
      ...telegram,
      notifications_enabled: notificationsEnabled,
      preferences,
    });
    setSaved(false);
    setTestResult(null);
    setError(false);

    try {
      const response = await apiClient.patch('/api/v1/integrations/telegram', {
        notifications_enabled: notificationsEnabled,
        preferences,
      });
      setTelegram(response.data.telegram);
      setSaved(true);
    } catch {
      setTelegram(previous);
      setError(true);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setError(false);
    setSaved(false);
    setTestResult(null);
    try {
      await apiClient.post('/api/v1/integrations/telegram/test');
      const refreshed = await load(true);
      setTestResult(refreshed ? 'sent' : 'refresh_failed');
    } catch {
      await load(true);
      setTestResult('failed');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    setError(false);
    try {
      await apiClient.delete('/api/v1/integrations/telegram');
      setDisconnectOpen(false);
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountSettingsPageLayout title={<Trans message="Integrations" />}>
      <ChatGptIntegrationPanel />
      <AccountSettingsPanel
        id="telegram"
        title={
          <span className="flex items-center gap-2">
            <SendIcon className="size-4" />
            <Trans message="Telegram" />
          </span>
        }
        titleSuffix={
          telegram ? (
            <Badge
              variant={
                telegram.enabled && telegram.connected ? 'positive' : 'secondary'
              }
            >
              {telegram.enabled && telegram.connected ? (
                <Trans message="Connected" />
              ) : telegram.enabled ? (
                <Trans message="Not connected" />
              ) : (
                <Trans message="Unavailable" />
              )}
            </Badge>
          ) : null
        }
      >
        {loading ? (
          <div className="flex min-h-28 items-center justify-center">
            <Spinner />
          </div>
        ) : error && !telegram ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              <Trans message="Unable to load Telegram settings. Try again." />
            </p>
            <Button variant="outline" onClick={() => void load()}>
              <RefreshCwIcon />
              <Trans message="Try again" />
            </Button>
          </div>
        ) : telegram ? (
          <div className="space-y-6">
            {!telegram.enabled ? (
              <p className="text-sm text-muted-foreground">
                <Trans message="Telegram notifications are not available right now." />
              </p>
            ) : telegram.connected ? (
              <>
                <div className="flex flex-col gap-4 rounded-card-sm border bg-secondary/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {telegram.username
                        ? `@${telegram.username}`
                        : <Trans message="Telegram account connected" />}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      <Trans message="Linket can send creator notifications to this private Telegram chat." />
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => void load()}
                    >
                      <RefreshCwIcon />
                      <Trans message="Refresh" />
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => void sendTest()}
                    >
                      <SendIcon />
                      <Trans message="Send test" />
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => void connect()}
                    >
                      <ExternalLinkIcon />
                      <Trans message="Reconnect" />
                    </Button>
                  </div>
                </div>

                <div className="rounded-card-sm border p-4">
                  <p className="text-sm font-semibold"><Trans message="Delivery status" /></p>
                  <p className="mt-1 text-sm font-medium">
                    {telegram.delivery_status === 'healthy' ? (
                      <Trans message="Last recorded delivery succeeded" />
                    ) : telegram.delivery_status === 'attention_required' ? (
                      <Trans message="Delivery needs attention" />
                    ) : (
                      <Trans message="No delivery recorded yet" />
                    )}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {telegram.delivery_status === 'healthy' ? (
                      <Trans message="The most recent recorded Telegram delivery succeeded." />
                    ) : telegram.delivery_status === 'attention_required' ? (
                      <Trans message="Open your bot chat, unblock the bot if needed, and send a test." />
                    ) : (
                      <Trans message="Send a test to check that Telegram can receive messages." />
                    )}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <Trans message="Delivery history may include a previously connected chat." />
                  </p>
                  {(telegram.last_delivery_at || telegram.last_failed_at) ? (
                    <dl className="mt-4 space-y-2 text-sm">
                      {telegram.last_delivery_at ? (
                        <div className="flex flex-wrap justify-between gap-2">
                          <dt className="text-muted-foreground"><Trans message="Last successful delivery" /></dt>
                          <dd><FormattedDate date={telegram.last_delivery_at} preset="timestamp" /></dd>
                        </div>
                      ) : null}
                      {telegram.last_failed_at ? (
                        <div className="flex flex-wrap justify-between gap-2">
                          <dt className="text-muted-foreground"><Trans message="Last failed delivery" /></dt>
                          <dd><FormattedDate date={telegram.last_failed_at} preset="timestamp" /></dd>
                        </div>
                      ) : null}
                    </dl>
                  ) : null}
                </div>

                <div className="divide-y rounded-card-sm border">
                  <PreferenceRow
                    label="Telegram notifications"
                    description="Pause or resume all Telegram creator notifications without disconnecting your account."
                    checked={telegram.notifications_enabled}
                    disabled={busy}
                    onChange={checked =>
                      void savePreferences(checked, telegram.preferences)
                    }
                  />
                  {preferenceRows.map(row => (
                    <PreferenceRow
                      key={row.key}
                      label={row.label}
                      description={row.description}
                      checked={telegram.preferences[row.key]}
                      disabled={busy || !telegram.notifications_enabled}
                      onChange={checked =>
                        void savePreferences(telegram.notifications_enabled, {
                          ...telegram.preferences,
                          [row.key]: checked,
                        })
                      }
                    />
                  ))}
                </div>

                {saved ? (
                  <p role="status" className="text-sm text-positive">
                    <Trans message="Telegram notification preferences updated." />
                  </p>
                ) : null}
                {testResult === 'sent' ? (
                  <p role="status" className="text-sm text-positive">
                    <Trans message="Test notification sent." />
                  </p>
                ) : testResult === 'failed' ? (
                  <p role="alert" className="text-sm text-destructive">
                    <Trans message="Could not confirm the test was sent. Refresh to update delivery status." />
                  </p>
                ) : testResult === 'refresh_failed' ? (
                  <p role="alert" className="text-sm text-destructive">
                    <Trans message="Test sent, but delivery status could not be refreshed." />
                  </p>
                ) : null}
                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    <Trans message="Unable to update Telegram. Try again." />
                  </p>
                ) : null}

                <div className="flex justify-end border-t pt-5">
                  <Button
                    variant="outline"
                    color="danger"
                    disabled={busy}
                    onClick={() => setDisconnectOpen(true)}
                  >
                    <UnplugIcon />
                    <Trans message="Disconnect Telegram" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    <Trans message="Unable to open Telegram right now. Try again." />
                  </p>
                ) : null}
                <div className="flex flex-col gap-4 rounded-card-sm border bg-secondary/30 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">
                      <Trans message="Connect your Telegram account" />
                    </p>
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                      <Trans message="Link your private Telegram chat to receive verified sale, inquiry, moderation, dispute and Pro billing notifications." />
                    </p>
                  </div>
                  <Button disabled={busy} onClick={() => void connect()}>
                    <SendIcon />
                    <Trans message="Connect Telegram" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : null}
      </AccountSettingsPanel>

      <AlertDialog.Root open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>
                <Trans message="Disconnect Telegram?" />
              </AlertDialog.Title>
              <AlertDialog.Description>
                <Trans message="Linket will stop sending Telegram notifications until you connect Telegram again." />
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel disabled={busy}>
                <Trans message="Cancel" />
              </AlertDialog.Cancel>
              <AlertDialog.Action
                color="danger"
                disabled={busy}
                onClick={() => void disconnect()}
              >
                <Trans message="Disconnect Telegram" />
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </AccountSettingsPageLayout>
  );
}

function PreferenceRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-5 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          <Trans message={label} />
        </p>
        <p className="mt-1 text-sm leading-5 text-muted-foreground">
          <Trans message={description} />
        </p>
      </div>
      <Switch
        aria-label={label}
        checked={checked}
        disabled={disabled}
        onCheckedChange={onChange}
      />
    </div>
  );
}

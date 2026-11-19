import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Trans} from '@ui/i18n/trans';
import {useCallback, useEffect, useState} from 'react';

type Mode = 'test' | 'live';
type ProfileStatus = {
  mode: Mode;
  configured: boolean;
  webhook_configured: boolean;
  approval_configured: boolean;
  public_key_masked: string | null;
};
type EnvironmentStatus = {
  active_mode: Mode | 'unconfigured';
  api_version: string;
  checkout_enabled: boolean;
  live_switch_allowed: boolean;
  live_payouts_enabled: boolean;
  profiles: Record<Mode, ProfileStatus>;
  in_flight: Record<string, number>;
  webhook_url: string;
  transfer_approval_url: string;
};
type ConfirmationAction = 'switch' | 'enable';

const url = '/api/v1/admin/billing/chapa';
const emptyFields = () => ({
  public_key: '', secret_key: '', webhook_secret: '', transfer_approval_secret: '',
});

export function ChapaEnvironmentManagerCard({onUpdated}: {onUpdated: () => void}) {
  const [status, setStatus] = useState<EnvironmentStatus>();
  const [selected, setSelected] = useState<Mode>('test');
  const [fields, setFields] = useState(emptyFields);
  const [action, setAction] = useState<ConfirmationAction | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async (initialize = false) => {
    const response = await apiClient.get(url + '/environments');
    const data = response.data.data as EnvironmentStatus;
    setStatus(data);
    if (initialize && data.active_mode !== 'unconfigured') setSelected(data.active_mode);
    onUpdated();
  }, [onUpdated]);

  useEffect(() => {
    let alive = true;
    apiClient.get(url + '/environments')
      .then(response => {
        if (!alive) return;
        const data = response.data.data as EnvironmentStatus;
        setStatus(data);
        if (data.active_mode !== 'unconfigured') setSelected(data.active_mode);
      })
      .catch(reason => { if (alive) setError(getApiErrorMessage(reason)); });
    return () => { alive = false; };
  }, []);

  const selectMode = (mode: Mode) => {
    setSelected(mode);
    setFields(emptyFields());
    setAction(null);
    setPassword('');
    setConfirmation('');
    setNotice('');
    setError('');
  };

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const values = Object.fromEntries(
      Object.entries(fields).filter(([, value]) => value !== ''),
    );
    if (Object.keys(values).length === 0) return;
    setSaving(true);
    setError('');
    try {
      await apiClient.put(url + '/environments/' + selected, values);
      setFields(emptyFields());
      await load();
      setNotice('Chapa ' + selected.toUpperCase() + ' credentials stored securely.');
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  const submitAction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!status || !action) return;
    setSaving(true);
    setError('');
    try {
      const endpoint = action === 'switch' ? '/activate' : '/enable';
      const body = {admin_password: password, confirmation, ...(action === 'switch' ? {mode: selected} : {})};
      await apiClient.post(url + endpoint, body);
      await load();
      setAction(null);
      setPassword('');
      setConfirmation('');
      setNotice(action === 'switch'
        ? 'Merchant mode changed. Checkout is paused until separately enabled.'
        : 'Checkout is enabled in the selected environment.');
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  const pause = async () => {
    setSaving(true);
    setError('');
    try {
      await apiClient.post(url + '/pause');
      await load();
      setNotice('Checkout paused. Existing orders and payouts were not modified.');
    } catch (reason) {
      setError(getApiErrorMessage(reason));
    } finally {
      setSaving(false);
    }
  };

  if (!status) {
    return <Card.Root><Card.Content><p role={error ? 'alert' : 'status'} className="text-sm">{error || 'Loading Chapa environments...'}</p></Card.Content></Card.Root>;
  }

  const profile = status.profiles[selected];
  const inFlight = Object.values(status.in_flight).reduce((total, count) => total + count, 0);
  const switching = selected !== status.active_mode;
  const expected = action === 'switch'
    ? 'SWITCH TO ' + selected.toUpperCase()
    : 'ENABLE ' + selected.toUpperCase() + ' CHECKOUT';
  const blockedLive = selected === 'live' && !status.live_switch_allowed;
  const canSave = Object.values(fields).some(Boolean) && !saving;
  const ready = profile.configured && profile.webhook_configured && profile.approval_configured;

  return (
    <Card.Root className="min-w-0">
      <Card.Header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <Card.Title><Trans message="Platform Chapa environments" /></Card.Title>
            <Card.Description>
              Save TEST and LIVE credentials separately. Current checkout integration uses the Chapa v1 API.
              Switching always pauses checkout; live payouts remain separately disabled.
            </Card.Description>
          </div>
          <Badge variant={status.checkout_enabled ? 'positive' : 'secondary'}>
            {status.checkout_enabled ? 'Checkout enabled' : 'Checkout paused'}
          </Badge>
        </div>
      </Card.Header>
      <Card.Content className="space-y-5">
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {notice && <p role="status" className="text-sm text-positive">{notice}</p>}
        <div className="flex flex-wrap gap-2" role="group" aria-label="Chapa merchant environment">
          {(['test', 'live'] as const).map(mode => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={selected === mode ? 'default' : 'outline'}
              aria-pressed={selected === mode}
              onClick={() => selectMode(mode)}
            >
              {mode.toUpperCase()} {status.active_mode === mode ? '(active)' : ''}
            </Button>
          ))}
        </div>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <StatusLine label="Merchant keys" ok={profile.configured} />
          <StatusLine label="Webhook signing" ok={profile.webhook_configured} />
          <StatusLine label="Transfer approval" ok={profile.approval_configured} />
        </div>

        <form onSubmit={saveProfile} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ProfileInput label="Public key" value={fields.public_key} onChange={value => setFields(v => ({...v, public_key: value}))}
              placeholder={profile.public_key_masked || (selected === 'test' ? 'CHAPUBK_TEST-...' : 'CHAPUBK-...')} />
            <ProfileInput label="Merchant secret key" type="password" value={fields.secret_key}
              onChange={value => setFields(v => ({...v, secret_key: value}))}
              placeholder={profile.configured ? '••••••••••••' : selected === 'test' ? 'CHASECK_TEST-...' : 'CHASECK-...'} />
            <ProfileInput label="Payment webhook secret" type="password" value={fields.webhook_secret}
              onChange={value => setFields(v => ({...v, webhook_secret: value}))}
              placeholder={profile.webhook_configured ? '••••••••••••' : 'Webhook signature secret'} />
            <ProfileInput label="Transfer approval secret" type="password" value={fields.transfer_approval_secret}
              onChange={value => setFields(v => ({...v, transfer_approval_secret: value}))}
              placeholder={profile.approval_configured ? '••••••••••••' : 'Separate Chapa approval secret'} />
          </div>
          <p className="text-xs text-muted-foreground">
            Keys are validated with Chapa before saving. Existing secrets are never displayed.
            For this v1 deployment use CHASECK keys; CHAPA_TEST/CHAPA_LIVE v2 keys need the v2 adapter.
          </p>
          <Button type="submit" size="sm" disabled={!canSave}>
            {saving ? 'Saving...' : 'Save ' + selected.toUpperCase() + ' configuration'}
          </Button>
        </form>

        <div className="min-w-0 space-y-2 border-t border-border pt-4 text-sm">
          <div><span className="text-muted-foreground">Payment webhook URL</span>
            <code className="mt-1 block break-all rounded-input bg-muted p-2 text-xs">{status.webhook_url}</code>
          </div>
          <div><span className="text-muted-foreground">Transfer approval URL</span>
            <code className="mt-1 block break-all rounded-input bg-muted p-2 text-xs">{status.transfer_approval_url}</code>
          </div>
          <p className="text-xs text-muted-foreground">Both callback URLs are server-to-server. Approval must match the saved withdrawal, amount and recipient.</p>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-sm font-semibold">Controlled checkout activation</p>
          <p className="text-xs text-muted-foreground">
            {inFlight} unresolved payment/withdrawal records. Switches are blocked until the count is zero.
            LIVE also requires the server release flag, provider approval and a fresh password confirmation.
          </p>
          {blockedLive && <p className="text-xs text-muted-foreground">LIVE mode locked: operator must explicitly allow activation on the server.</p>}
          <div className="flex flex-wrap gap-2">
            {switching && (
              <Button type="button" variant="outline" size="sm" disabled={saving || !ready || inFlight > 0 || blockedLive}
                onClick={() => { setAction('switch'); setConfirmation(''); setPassword(''); }}>
                Switch to {selected.toUpperCase()}
              </Button>
            )}
            {!switching && !status.checkout_enabled && (
              <Button type="button" variant="outline" size="sm" disabled={saving || !ready || blockedLive}
                onClick={() => { setAction('enable'); setConfirmation(''); setPassword(''); }}>
                Enable {selected.toUpperCase()} checkout
              </Button>
            )}
            {status.checkout_enabled && (
              <Button type="button" variant="outline" size="sm" disabled={saving} onClick={() => void pause()}>
                Pause checkout
              </Button>
            )}
          </div>
          {action && (
            <form onSubmit={submitAction} className="space-y-3 rounded-input border p-3">
              <p className="text-sm">Type <strong>{expected}</strong> and confirm with your Linket administrator password.</p>
              <Field.Root>
                <Field.Label>Confirmation phrase</Field.Label>
                <Input value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="off" />
              </Field.Root>
              <Field.Root>
                <Field.Label>Administrator password</Field.Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
              </Field.Root>
              <div className="flex gap-2">
                <Button type="submit" disabled={saving || confirmation !== expected || !password}>{saving ? 'Checking...' : 'Confirm'}</Button>
                <Button type="button" variant="outline" onClick={() => setAction(null)}>Cancel</Button>
              </div>
            </form>
          )}
          <p className="text-xs text-muted-foreground">Switching modes never activates live seller payouts. Existing order and ledger records are not converted between environments.</p>
        </div>
      </Card.Content>
    </Card.Root>
  );
}

function StatusLine({label, ok}: {label: string; ok: boolean}) {
  return (
    <div className="rounded-input border p-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="font-medium">{ok ? 'Configured' : 'Missing'}</p>
    </div>
  );
}

function ProfileInput({label, value, onChange, placeholder, type = 'text'}: {
  label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string;
}) {
  return (
    <Field.Root className="min-w-0">
      <Field.Label>{label}</Field.Label>
      <Input type={type} autoComplete={type === 'password' ? 'new-password' : 'off'}
        spellCheck={false} value={value} placeholder={placeholder} onChange={event => onChange(event.target.value)} />
    </Field.Root>
  );
}

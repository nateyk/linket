import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Switch} from '@shadcn/forms/switch/switch';
import {Spinner} from '@shadcn/spinner/spinner';
import {Table} from '@shadcn/table/table';
import {Tabs} from '@shadcn/tabs/tabs';
import {Trans} from '@ui/i18n/trans';
import {formatMoney} from '@ui/i18n/format-money';
import {
  BanknoteIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  CoinsIcon,
  CopyIcon,
  CreditCardIcon,
  PlayIcon,
  ScaleIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Link} from 'react-router';
import {CurrencySettingsCard} from './currency-settings-card';

type Tab = 'chapa' | 'currency' | 'payout-methods' | 'commission' | 'reconciliation';

type GatewayConfig = {
  gateway: string;
  secret_configured: boolean;
  public_key_masked: string | null;
  webhook_secret_configured: boolean;
  webhook_url: string;
};

type WithdrawalMethod = {
  id: number;
  name: string;
  code: string;
  destination_label?: string | null;
  minimum_amount_cents?: number | null;
  maximum_amount_cents?: number | null;
  is_active: boolean;
};

const subscriptionGatewayUrl = '/api/v1/admin/billing/subscription-gateway';
const financialSummaryUrl = '/api/v1/admin/marketplace/financial-summary';
const reconcileUrl = '/api/v1/admin/marketplace/reconcile';

function canSaveChapaCredentials(publicKey: string, secretKey: string, webhookSecret: string): boolean {
  const hasPublic = publicKey.trim() !== '';
  const hasSecret = secretKey.trim() !== '';
  const hasWebhook = webhookSecret.trim() !== '';
  if (hasPublic !== hasSecret) {
    return false;
  }

  return (hasPublic && hasSecret) || hasWebhook;
}

type ReconciliationData = {
  ledger_audit: {
    is_balanced: boolean;
    total_debits_cents: number;
    total_credits_cents: number;
    clearing_balance_cents: number;
    total_creator_liabilities_cents: number;
    platform_commission_cents: number;
    total_disbursed_cents: number;
    negative_balances_count: number;
    issues_count: number;
  };
  pending_action_counts: {
    stale_payment_attempts: number;
    stale_payout_intents: number;
    matured_escrow_orders: number;
    deficit_creators: number;
  };
};

export function Component() {
  const [tab, setTab] = useState<Tab>('chapa');

  return (
    <DashboardLayout.MainSection>
      <DashboardLayout.SectionHeader>
        <DashboardLayout.SidebarToggle />
        <div className="flex-1 min-w-0">
          <DashboardLayout.SectionTitle>
            <Trans message="Financial settings & operations" />
          </DashboardLayout.SectionTitle>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <Trans message="Manage platform payments, currency formatting, withdrawal rules, commission policies, and ledger reconciliation." />
          </p>
        </div>
        <Button variant="outline" nativeButton={false} render={<Link to="/admin/withdrawals" />}>
          <CreditCardIcon />
          <Trans message="Withdrawals dashboard" />
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5">
          <Tabs.Root value={tab} onValueChange={v => setTab(v as Tab)} className="gap-6">
            <div className="min-w-0 overflow-x-auto border-b border-border">
              <Tabs.List variant="line" className="w-max justify-start">
                <Tabs.Tab value="chapa" className="flex-none">
                  <CreditCardIcon className="size-4" />
                  <Trans message="Platform Chapa" />
                </Tabs.Tab>
                <Tabs.Tab value="currency" className="flex-none">
                  <CoinsIcon className="size-4" />
                  <Trans message="Default currency" />
                </Tabs.Tab>
                <Tabs.Tab value="payout-methods" className="flex-none">
                  <CoinsIcon className="size-4" />
                  <Trans message="Payout methods" />
                </Tabs.Tab>
                <Tabs.Tab value="commission" className="flex-none">
                  <BanknoteIcon className="size-4" />
                  <Trans message="Commissions & policy" />
                </Tabs.Tab>
                <Tabs.Tab value="reconciliation" className="flex-none">
                  <ScaleIcon className="size-4" />
                  <Trans message="Ledger audit & reconciliation" />
                </Tabs.Tab>
              </Tabs.List>
            </div>

            <Tabs.Panel value="chapa">
              <ChapaPlatformGatewayTab />
            </Tabs.Panel>
            <Tabs.Panel value="currency">
              <CurrencySettingsCard />
            </Tabs.Panel>
            <Tabs.Panel value="payout-methods">
              <PayoutMethodsTab />
            </Tabs.Panel>
            <Tabs.Panel value="commission">
              <CommissionPoliciesTab />
            </Tabs.Panel>
            <Tabs.Panel value="reconciliation">
              <ReconciliationAuditTab />
            </Tabs.Panel>
          </Tabs.Root>
        </div>
      </DashboardLayout.SectionContent>
    </DashboardLayout.MainSection>
  );
}

function ChapaPlatformGatewayTab() {
  const [config, setConfig] = useState<GatewayConfig>();
  const [publicKey, setPublicKey] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{type: 'error' | 'success'; text: string}>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(subscriptionGatewayUrl);
      setConfig(res.data.data);
    } catch {
      setStatusMsg({type: 'error', text: 'Unable to load Chapa gateway configuration.'});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSaveChapaCredentials(publicKey, secretKey, webhookSecret)) {
      return;
    }
    setSaving(true);
    setStatusMsg(undefined);
    try {
      const payload: Record<string, string> = {gateway: 'chapa'};
      if (publicKey.trim() && secretKey.trim()) {
        payload.public_key = publicKey.trim();
        payload.secret_key = secretKey.trim();
      }
      if (webhookSecret.trim()) payload.webhook_secret = webhookSecret.trim();

      const res = await apiClient.put(subscriptionGatewayUrl, payload);
      setConfig(res.data.data);
      setPublicKey('');
      setSecretKey('');
      setWebhookSecret('');
      setStatusMsg({type: 'success', text: 'Chapa credentials validated and saved.'});
    } catch (reason) {
      setStatusMsg({type: 'error', text: getApiErrorMessage(reason)});
    } finally {
      setSaving(false);
    }
  };

  const copyWebhookUrl = () => {
    if (!config?.webhook_url) return;
    void navigator.clipboard.writeText(config.webhook_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <TabLoadingSpinner />;

  return (
    <Card.Root>
      <Card.Header>
        <div className="flex items-center justify-between">
          <div>
            <Card.Title><Trans message="Platform Chapa Merchant Gateway" /></Card.Title>
            <Card.Description>
              <Trans message="All buyer orders and subscriptions flow into this platform merchant account. Individual creators do not need Chapa keys." />
            </Card.Description>
          </div>
          <Badge variant={config?.secret_configured ? 'positive' : 'destructive'}>
            {config?.secret_configured ? <Trans message="Connected" /> : <Trans message="Not configured" />}
          </Badge>
        </div>
      </Card.Header>
      <Card.Content className="space-y-6">
        {statusMsg && (
          <div role={statusMsg.type === 'error' ? 'alert' : 'status'} className={`flex items-center gap-2 rounded-input border p-3 text-sm ${statusMsg.type === 'error' ? 'border-destructive/40 bg-destructive/5 text-destructive' : 'border-positive/40 bg-positive/5 text-positive'}`}>
            {statusMsg.type === 'error' ? <CircleAlertIcon className="size-4 shrink-0" /> : <CheckCircle2Icon className="size-4 shrink-0" />}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field.Root>
              <Field.Label><Trans message="Public key" /></Field.Label>
              <Input
                value={publicKey}
                onChange={e => setPublicKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder={config?.public_key_masked ?? 'CHAPUBK_TEST-...'}
              />
              <Field.Description><Trans message="Your Chapa public key. Test keys start with CHAPUBK_TEST- and live keys start with CHAPUBK-." /></Field.Description>
            </Field.Root>

            <Field.Root>
              <Field.Label><Trans message="Secret key" /></Field.Label>
              <Input
                type="password"
                value={secretKey}
                onChange={e => setSecretKey(e.target.value)}
                autoComplete="new-password"
                spellCheck={false}
                placeholder={config?.secret_configured ? '••••••••••••••••' : 'CHASECK_TEST-...'}
              />
              <Field.Description><Trans message="Secret key from the same page. Chapa checks it before saving." /></Field.Description>
            </Field.Root>
          </div>

          <Field.Root>
            <Field.Label><Trans message="Webhook signing secret (optional)" /></Field.Label>
            <Input
              type="password"
              value={webhookSecret}
              onChange={e => setWebhookSecret(e.target.value)}
              autoComplete="new-password"
              spellCheck={false}
              placeholder={config?.webhook_secret_configured ? '••••••••••••••••' : 'Enter webhook secret...'}
            />
            <Field.Description><Trans message="Used to verify HMAC-SHA256 signatures on inbound Chapa webhooks." /></Field.Description>
          </Field.Root>

          <Field.Root>
            <Field.Label><Trans message="Webhook callback URL" /></Field.Label>
            <div className="flex gap-2">
              <Input readOnly value={config?.webhook_url ?? ''} className="font-mono text-xs" />
              <Button type="button" variant="outline" onClick={copyWebhookUrl}>
                <CopyIcon />
                {copied ? <Trans message="Copied" /> : <Trans message="Copy" />}
              </Button>
            </div>
            <Field.Description><Trans message="Register this endpoint in your Chapa Merchant Dashboard." /></Field.Description>
          </Field.Root>

          {(publicKey.trim() !== '') !== (secretKey.trim() !== '') && (
            <p role="alert" className="text-sm text-destructive">
              <Trans message="Enter the public key and the secret key together." />
            </p>
          )}

          <Button type="submit" color="primary" disabled={saving || !canSaveChapaCredentials(publicKey, secretKey, webhookSecret)}>
            {saving ? <Trans message="Saving & validating..." /> : <Trans message="Save Chapa credentials" />}
          </Button>
        </form>
      </Card.Content>
    </Card.Root>
  );
}

function PayoutMethodsTab() {
  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/api/v1/admin/financial/withdrawal-methods');
      setMethods(res.data.data ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <TabLoadingSpinner />;

  return (
    <Card.Root>
      <Card.Header>
        <div className="flex items-center justify-between">
          <div>
            <Card.Title><Trans message="Supported withdrawal methods" /></Card.Title>
            <Card.Description>
              <Trans message="Banks and mobile wallets available for creator withdrawals with configured limits." />
            </Card.Description>
          </div>
          <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/admin/financial/withdrawal-methods" />}>
            <Trans message="Creator receiving accounts" />
          </Button>
        </div>
      </Card.Header>
      <Card.Content>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head><Trans message="Method" /></Table.Head>
              <Table.Head><Trans message="Code" /></Table.Head>
              <Table.Head><Trans message="Min withdrawal" /></Table.Head>
              <Table.Head><Trans message="Max withdrawal" /></Table.Head>
              <Table.Head><Trans message="Status" /></Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {methods.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={5} className="text-center py-6 text-muted-foreground">
                  <Trans message="No withdrawal methods configured." />
                </Table.Cell>
              </Table.Row>
            ) : (
              methods.map(m => (
                <Table.Row key={m.id}>
                  <Table.Cell className="font-medium">{m.name}</Table.Cell>
                  <Table.Cell className="font-mono text-xs text-muted-foreground">{m.code}</Table.Cell>
                  <Table.Cell>{m.minimum_amount_cents ? formatMoney(m.minimum_amount_cents, 'ETB') : '100.00 ETB'}</Table.Cell>
                  <Table.Cell>{m.maximum_amount_cents ? formatMoney(m.maximum_amount_cents, 'ETB') : 'Unlimited'}</Table.Cell>
                  <Table.Cell>
                    <Badge variant={m.is_active ? 'positive' : 'outline'}>
                      {m.is_active ? <Trans message="Active" /> : <Trans message="Inactive" />}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              ))
            )}
          </Table.Body>
        </Table.Root>
      </Card.Content>
    </Card.Root>
  );
}

function CommissionPoliciesTab() {
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title><Trans message="Marketplace commission & settlement policy" /></Card.Title>
        <Card.Description>
          <Trans message="Platform monetization, escrow hold periods, and withdrawal rules." />
        </Card.Description>
      </Card.Header>
      <Card.Content className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-input border p-4 space-y-1">
            <p className="text-xs text-muted-foreground"><Trans message="Escrow hold period" /></p>
            <p className="text-xl font-bold">7 <span className="text-sm font-normal text-muted-foreground"><Trans message="days" /></span></p>
            <p className="text-xs text-muted-foreground"><Trans message="Sales clear hold before becoming available for withdrawal." /></p>
          </div>
          <div className="rounded-input border p-4 space-y-1">
            <p className="text-xs text-muted-foreground"><Trans message="Minimum withdrawal" /></p>
            <p className="text-xl font-bold">100.00 <span className="text-sm font-normal text-muted-foreground">ETB</span></p>
            <p className="text-xs text-muted-foreground"><Trans message="Minimum balance required to submit a withdrawal request." /></p>
          </div>
          <div className="rounded-input border p-4 space-y-1">
            <p className="text-xs text-muted-foreground"><Trans message="Monetization model" /></p>
            <p className="text-xl font-bold"><Trans message="Platform Chapa" /></p>
            <p className="text-xs text-muted-foreground"><Trans message="Buyers pay Linket merchant; platform disburses net earnings." /></p>
          </div>
        </div>

        <div className="rounded-input border bg-muted/20 p-4 space-y-2 text-sm">
          <p className="font-semibold"><Trans message="Single-Profile Marketplace Principles" /></p>
          <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
            <li><Trans message="Zero seller gateway keys: creators never provide personal Chapa API secrets." /></li>
            <li><Trans message="Double-entry ledger: every buyer sale, fee deduction, and withdrawal is recorded in immutable journal entries." /></li>
            <li><Trans message="Three-stage payout operations: admin approval, automated transfer dispatch, and verified settlement." /></li>
            <li><Trans message="Single-profile UX: creator finance is personal and never exposes workspaces or workspace switchers." /></li>
          </ul>
        </div>
      </Card.Content>
    </Card.Root>
  );
}

function ReconciliationAuditTab() {
  const [data, setData] = useState<ReconciliationData>();
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [report, setReport] = useState<string>();
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(financialSummaryUrl);
      setData(res.data.data);
    } catch {
      setError('Unable to load reconciliation summary.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleReconcile = async () => {
    setReconciling(true);
    setReport(undefined);
    setError(undefined);
    try {
      const res = await apiClient.post(reconcileUrl, {dry_run: dryRun});
      const d = res.data.data;
      setReport(
        `Reconciliation complete (${d.dry_run ? 'Dry Run' : 'Applied'}): ${d.matured_orders_count} matured orders, ${d.reconciled_payments_count} payments, ${d.reconciled_payouts_count} payouts processed.`
      );
      await load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e));
    } finally {
      setReconciling(false);
    }
  };

  if (loading) return <TabLoadingSpinner />;

  const audit = data?.ledger_audit;
  const pending = data?.pending_action_counts;

  return (
    <Card.Root>
      <Card.Header>
        <div className="flex items-center justify-between">
          <div>
            <Card.Title><Trans message="Double-entry ledger integrity audit" /></Card.Title>
            <Card.Description>
              <Trans message="Verifies debit/credit balance, creator liabilities, and platform clearing accounts." />
            </Card.Description>
          </div>
          <Badge variant={audit?.is_balanced ? 'positive' : 'destructive'}>
            {audit?.is_balanced ? <Trans message="Balanced (Debits = Credits)" /> : <Trans message="Imbalanced" />}
          </Badge>
        </div>
      </Card.Header>
      <Card.Content className="space-y-6">
        {error && (
          <div role="alert" className="flex items-center gap-2 rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
            <CircleAlertIcon className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {report && (
          <div role="status" className="flex items-center gap-2 rounded-input border border-positive/40 bg-positive/5 p-3 text-sm text-positive">
            <CheckCircle2Icon className="size-4 shrink-0" />
            <span>{report}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-input border p-3">
            <p className="text-xs text-muted-foreground"><Trans message="Platform clearing" /></p>
            <p className="text-lg font-semibold tabular-nums">{formatMoney(audit?.clearing_balance_cents ?? 0, 'ETB')}</p>
          </div>
          <div className="rounded-input border p-3">
            <p className="text-xs text-muted-foreground"><Trans message="Creator liabilities" /></p>
            <p className="text-lg font-semibold tabular-nums">{formatMoney(audit?.total_creator_liabilities_cents ?? 0, 'ETB')}</p>
          </div>
          <div className="rounded-input border p-3">
            <p className="text-xs text-muted-foreground"><Trans message="Platform commission" /></p>
            <p className="text-lg font-semibold tabular-nums">{formatMoney(audit?.platform_commission_cents ?? 0, 'ETB')}</p>
          </div>
          <div className="rounded-input border p-3">
            <p className="text-xs text-muted-foreground"><Trans message="Total disbursed" /></p>
            <p className="text-lg font-semibold tabular-nums">{formatMoney(audit?.total_disbursed_cents ?? 0, 'ETB')}</p>
          </div>
        </div>

        <div className="rounded-input border p-4 space-y-3">
          <p className="font-semibold text-sm"><Trans message="Actionable items" /></p>
          <div className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
            <div>
              <span className="text-muted-foreground"><Trans message="Matured escrow:" /> </span>
              <span className="font-bold">{pending?.matured_escrow_orders ?? 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground"><Trans message="Stale payments:" /> </span>
              <span className="font-bold">{pending?.stale_payment_attempts ?? 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground"><Trans message="Stale payouts:" /> </span>
              <span className="font-bold">{pending?.stale_payout_intents ?? 0}</span>
            </div>
            <div>
              <span className="text-muted-foreground"><Trans message="Deficit creators:" /> </span>
              <span className="font-bold">{pending?.deficit_creators ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-input border bg-muted/20 p-4">
          <div className="flex items-center gap-3">
            <Switch checked={dryRun} onCheckedChange={setDryRun} />
            <span className="text-sm"><Trans message="Dry run mode (preview without applying mutations)" /></span>
          </div>
          <Button color="primary" disabled={reconciling} onClick={() => void handleReconcile()}>
            <PlayIcon />
            {reconciling ? <Trans message="Reconciling..." /> : <Trans message="Run reconciliation" />}
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  );
}

function TabLoadingSpinner() {
  return (
    <div className="flex h-48 items-center justify-center">
      <Spinner className="size-6" />
    </div>
  );
}

export {
  ChapaPlatformGatewayTab,
  CommissionPoliciesTab,
  PayoutMethodsTab,
  ReconciliationAuditTab,
};

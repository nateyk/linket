import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
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
  CreditCardIcon,
  PlayIcon,
  ScaleIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import {Link} from 'react-router';
import {CurrencySettingsCard} from './currency-settings-card';
import {ChapaPayoutReadinessCard} from './chapa-payout-readiness-card';
import {ChapaEnvironmentManagerCard} from './chapa-environment-manager-card';

type Tab = 'chapa' | 'currency' | 'payout-methods' | 'commission' | 'reconciliation';

type WithdrawalMethod = {
  id: number;
  name: string;
  code: string;
  destination_label?: string | null;
  minimum_amount_cents?: number | null;
  maximum_amount_cents?: number | null;
  is_active: boolean;
};

const financialSummaryUrl = '/api/v1/admin/marketplace/financial-summary';
const reconcileUrl = '/api/v1/admin/marketplace/reconcile';

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
      <DashboardLayout.SectionHeader className="max-sm:h-14 max-sm:gap-2 max-sm:px-3">
        <DashboardLayout.SidebarToggle />
        <div className="flex-1 min-w-0">
          <DashboardLayout.SectionTitle>
            <span className="sm:hidden"><Trans message="Financial settings" /></span>
            <span className="hidden sm:inline"><Trans message="Financial settings & operations" /></span>
          </DashboardLayout.SectionTitle>
          <p className="mt-0.5 hidden text-sm text-muted-foreground lg:block">
            <Trans message="Manage platform payments, currency formatting, withdrawal rules, commission policies, and ledger reconciliation." />
          </p>
        </div>
        <Button variant="outline" className="shrink-0 max-sm:size-9 max-sm:p-0" nativeButton={false} render={<Link to="/admin/withdrawals" aria-label="Withdrawals dashboard" />}>
          <CreditCardIcon />
          <span className="max-sm:hidden"><Trans message="Withdrawals dashboard" /></span>
        </Button>
      </DashboardLayout.SectionHeader>
      <DashboardLayout.SectionContent className="overflow-y-auto">
        <div className="mx-auto w-full min-w-0 max-w-6xl space-y-6 px-3 py-4 sm:px-4 sm:py-5">
          <Tabs.Root value={tab} onValueChange={v => setTab(v as Tab)} className="gap-6">
            <div className="max-w-full min-w-0 overflow-x-auto border-b border-border">
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
  const [revision, setRevision] = useState(0);

  return (
    <div className="space-y-4">
      <ChapaEnvironmentManagerCard onUpdated={() => setRevision(current => current + 1)} />
      <ChapaPayoutReadinessCard key={revision} />
    </div>
  );
}

function PayoutMethodsTab() {
  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const methodRes = await apiClient.get('/api/v1/admin/financial/withdrawal-methods');
      setMethods((methodRes.data.data ?? []).filter((method: WithdrawalMethod) =>
        ['bank_transfer', 'cbebirr', 'mpesa', 'telebirr', 'yaya'].includes(method.code)
      ));
      setError(undefined);
    } catch (e: unknown) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggleMethod = async (method: WithdrawalMethod, enabled: boolean) => {
    setBusyId('method-' + method.id);
    try {
      await apiClient.put('/api/v1/admin/financial/withdrawal-methods/' + method.id, {is_active: enabled});
      await load();
    } catch (e: unknown) {
      setError(getApiErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <TabLoadingSpinner />;

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Card.Root>
        <Card.Header>
          <Card.Title><Trans message="Withdrawal providers" /></Card.Title>
          <Card.Description>
            <Trans message="Only CBE Birr, Commercial Bank of Ethiopia, M-Pesa, telebirr and YaYaWallet can be offered. Sellers see a provider only if it is enabled here and active in the Chapa v1 bank list." />
          </Card.Description>
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">
              <Trans message="Configure Chapa Transfer Approval URL in your merchant dashboard:" /> <code>/api/v1/chapa/transfer-approval</code>
            </p>
            <Button variant="outline" size="sm" nativeButton={false} render={<Link to="/admin/financial/withdrawal-methods/legacy" />}>
              <Trans message="Manage provider limits" />
            </Button>
          </div>
        </Card.Header>
        <Card.Content>
          <Table.Root>
            <Table.Header>
              <Table.Row>
                <Table.Head><Trans message="Provider" /></Table.Head>
                <Table.Head><Trans message="Minimum" /></Table.Head>
                <Table.Head><Trans message="Maximum" /></Table.Head>
                <Table.Head><Trans message="Enabled" /></Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {methods.map(m => (
                <Table.Row key={m.id}>
                  <Table.Cell className="font-medium">{m.name}</Table.Cell>
                  <Table.Cell>{formatMoney(m.minimum_amount_cents ?? 0, 'ETB')}</Table.Cell>
                  <Table.Cell>{m.maximum_amount_cents ? formatMoney(m.maximum_amount_cents, 'ETB') : 'Unlimited'}</Table.Cell>
                  <Table.Cell>
                    <Switch
                      checked={m.is_active}
                      disabled={busyId !== null}
                      onCheckedChange={enabled => void toggleMethod(m, enabled)}
                      aria-label={m.name + ' payouts'}
                    />
                  </Table.Cell>
                </Table.Row>
              ))}
              {methods.length === 0 && (
                <Table.Row><Table.Cell colSpan={4}><Trans message="No supported Chapa payout methods available." /></Table.Cell></Table.Row>
              )}
            </Table.Body>
          </Table.Root>
        </Card.Content>
      </Card.Root>

    </div>
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

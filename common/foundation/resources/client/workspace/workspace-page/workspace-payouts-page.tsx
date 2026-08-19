import {apiClient} from '@common/http/query-client';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {useCallback, useEffect, useState} from 'react';
import {Trans} from '@ui/i18n/trans';
import {formatMoney} from '@ui/i18n/format-money';
import {AccountSettingsPanel} from '@common/auth/ui/account-settings/account-settings-panel';
import {Alert} from '@shadcn/alert/alert';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {Select} from '@shadcn/forms/select/select';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Accordion} from '@shadcn/accordion/accordion';
import {toast} from '@shadcn/toast/toast';
import {Loader2Icon, SaveIcon} from 'lucide-react';
import {FormEvent, useId} from 'react';

type WithdrawalMethod = {
  id: number;
  name: string;
  code: string;
  minimum_amount_cents: number;
  maximum_amount_cents: number | null;
  destination_label: string;
  instructions?: string | null;
};

type PayoutConfig = {
  withdrawal_method_id: number | null;
  withdrawal_account: string;
};

export function Component() {
  const {workspaceId} = useRequiredParams(['workspaceId']);

  return <WorkspacePayoutsPage workspaceId={workspaceId} />;
}

interface WorkspacePayoutsPageProps {
  workspaceId: string | number;
}

export function WorkspacePayoutsPage({workspaceId}: WorkspacePayoutsPageProps) {
  const [config, setConfig] = useState<PayoutConfig>({
    withdrawal_method_id: null,
    withdrawal_account: '',
  });
  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();
  const formId = useId();

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [configRes, methodsRes] = await Promise.all([
        apiClient.get(`/api/v1/workspaces/${workspaceId}/payout-config`),
        apiClient.get(`/api/v1/digital-products/withdrawal-methods`),
      ]);

      const configData = configRes.data?.data ?? {};
      setConfig({
        withdrawal_method_id: configData.withdrawal_method_id ?? null,
        withdrawal_account: configData.withdrawal_account ?? '',
      });
      setMethods(methodsRes.data?.data ?? []);
    } catch {
      setError('Unable to load payout configuration.');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!config.withdrawal_method_id || !config.withdrawal_account.trim()) {
      setError('Select a withdrawal method and enter the account details.');
      return;
    }

    setSaving(true);
    setError(undefined);
    try {
      await apiClient.post(`/api/v1/workspaces/${workspaceId}/payout-config`, {
        withdrawal_method_id: config.withdrawal_method_id,
        withdrawal_account: config.withdrawal_account.trim(),
      });
      await load();
      toast.success(<Trans message="Payout settings saved" />);
    } catch {
      setError('Unable to save payout configuration.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <AccountSettingsPanel
        id="withdrawal-details"
        title={<Trans message="Withdrawal Details" />}
        actions={
          <Button
            type="submit"
            form={formId}
            variant="default"
            color="primary"
            size="sm"
            disabled={saving}
          >
            <SaveIcon />
            {saving ? <Trans message="Saving..." /> : <Trans message="Save Changes" />}
          </Button>
        }
      >
        {error && (
          <Alert.Root variant="destructive" fillStyle="subtleFill" className="mb-5">
            <Alert.Description>{error}</Alert.Description>
          </Alert.Root>
        )}
        <form id={formId} onSubmit={handleSave} className="flex flex-col gap-5">
          <Field.Root>
            <Field.Label>
              <Trans message="Withdrawal Method" />
            </Field.Label>
            <Select.Root
              value={config.withdrawal_method_id ? String(config.withdrawal_method_id) : ''}
              onValueChange={value => setConfig({...config, withdrawal_method_id: value ? Number(value) : null})}
            >
              <Select.Trigger>
                <Select.Value placeholder={<Trans message="Choose a method" />} />
              </Select.Trigger>
              <Select.Content>
                {methods.map(method => (
                  <Select.Item key={method.id} value={String(method.id)}>
                    {method.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </Field.Root>

          <Field.Root>
            <Field.Label>
              <Trans message="Withdrawal Account" />
            </Field.Label>
            <Textarea
              value={config.withdrawal_account}
              onChange={event => setConfig({...config, withdrawal_account: event.target.value})}
              rows={5}
              placeholder="Enter your withdrawal account details (e.g., email, wallet address, bank details)"
            />
          </Field.Root>
        </form>
      </AccountSettingsPanel>

      <AccountSettingsPanel
        id="withdrawal-methods"
        title={<Trans message="Withdrawal Methods" />}
      >
        <Accordion className="w-full">
          {methods.length ? (
            methods.map(method => (
              <Accordion.Item key={method.id} value={String(method.id)}>
                <Accordion.Trigger>
                  {method.name}
                </Accordion.Trigger>
                <Accordion.Content className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      <Trans message="Minimum Withdrawal Amount" />
                    </span>
                    <strong>
                      {formatMoney(method.minimum_amount_cents)}
                    </strong>
                  </div>
                  {method.maximum_amount_cents && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        <Trans message="Maximum Withdrawal Amount" />
                      </span>
                      <strong>
                        {formatMoney(method.maximum_amount_cents)}
                      </strong>
                    </div>
                  )}
                  {method.instructions && (
                    <div className="text-sm text-muted-foreground">
                      {method.instructions}
                    </div>
                  )}
                </Accordion.Content>
              </Accordion.Item>
            ))
          ) : (
            <Accordion.Item value="none">
              <Accordion.Trigger>
                <Trans message="No withdrawal methods available" />
              </Accordion.Trigger>
              <Accordion.Content>
                <Trans message="No withdrawal methods have been configured yet." />
              </Accordion.Content>
            </Accordion.Item>
          )}
        </Accordion>
      </AccountSettingsPanel>
    </div>
  );
}
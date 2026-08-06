import {apiClient} from '@common/http/query-client';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {useCallback, useEffect, useState} from 'react';
import {Trans} from '@ui/i18n/trans';
import {Button} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {Select} from '@shadcn/forms/select/select';
import {Textarea} from '@shadcn/forms/textarea/textarea';
import {Accordion} from '@shadcn/accordion/accordion';
import {Card} from '@shadcn/card/card';
import {Loader2Icon, SaveIcon, HelpCircleIcon} from 'lucide-react';

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

  const [config, setConfig] = useState<PayoutConfig>({
    withdrawal_method_id: null,
    withdrawal_account: '',
  });
  const [methods, setMethods] = useState<WithdrawalMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

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

  const handleSave = async () => {
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
    <div className="space-y-6">
      {error && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          {error}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <Card.Header>
            <Card.Title>
              <Trans message="Withdrawal Details" />
            </Card.Title>
            <Card.Description>
              <Trans message="Configure your default withdrawal method and account for this workspace." />
            </Card.Description>
          </Card.Header>
          <Card.Content className="space-y-4">
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

            <Button className="w-full" disabled={saving} onClick={handleSave}>
              <SaveIcon className="mr-2 h-4 w-4" />
              {saving ? <Trans message="Saving..." /> : <Trans message="Save Changes" />}
            </Button>
          </Card.Content>
        </Card>

        <Card>
          <Card.Header>
            <Card.Title className="flex items-center gap-2">
              <Trans message="Withdrawal Methods" />
              <HelpCircleIcon className="h-4 w-4 text-muted-foreground" />
            </Card.Title>
            <Card.Description>
              <Trans message="Available withdrawal methods with their minimum amounts and details." />
            </Card.Description>
          </Card.Header>
          <Card.Content>
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
                          {new Intl.NumberFormat(undefined, {
                            style: 'currency',
                            currency: 'USD',
                          }).format(method.minimum_amount_cents / 100)}
                        </strong>
                      </div>
                      {method.maximum_amount_cents && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            <Trans message="Maximum Withdrawal Amount" />
                          </span>
                          <strong>
                            {new Intl.NumberFormat(undefined, {
                              style: 'currency',
                              currency: 'USD',
                            }).format(method.maximum_amount_cents / 100)}
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
          </Card.Content>
        </Card>
      </div>
    </div>
  );
}
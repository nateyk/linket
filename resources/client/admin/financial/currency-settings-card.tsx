import {listSettingsOptions, updateSettingsOptions} from '@common/admin/settings/settings-queries';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Spinner} from '@shadcn/spinner/spinner';
import {toast} from '@shadcn/toast/toast';
import {useMutation, useQuery} from '@tanstack/react-query';
import {getBootstrapData, setBootstrapData} from '@ui/bootstrap-data/bootstrap-data-store';
import {Trans} from '@ui/i18n/trans';
import {CheckCircle2Icon, CircleAlertIcon, CoinsIcon} from 'lucide-react';
import {FormEvent, useEffect, useMemo, useState} from 'react';

type CurrencyPosition = 'after' | 'before';

const positionOptions: {label: string; value: CurrencyPosition}[] = [
  {label: 'After amount (234.00 Br)', value: 'after'},
  {label: 'Before amount (Br 234.00)', value: 'before'},
];

export function CurrencySettingsCard() {
  const bootstrap = getBootstrapData();
  const billingSettings = bootstrap?.settings?.billing;

  const {data: adminSettings, isLoading: settingsLoading} = useQuery(listSettingsOptions());

  const initialCurrency =
    adminSettings?.client?.billing?.currency ||
    billingSettings?.currency ||
    'ETB';

  const initialSymbol =
    adminSettings?.client?.billing?.currency_symbol ||
    billingSettings?.currency_symbol ||
    'Br';

  const initialPosition: CurrencyPosition =
    adminSettings?.client?.billing?.currency_symbol_position === 'before'
      ? 'before'
      : 'after';

  const [currency, setCurrency] = useState(initialCurrency);
  const [currencySymbol, setCurrencySymbol] = useState(initialSymbol);
  const [currencyPosition, setCurrencyPosition] = useState<CurrencyPosition>(initialPosition);
  const [isInitialized, setIsInitialized] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{type: 'error' | 'success'; text: string}>();

  // Sync state once remote admin settings load initially
  useEffect(() => {
    if (adminSettings?.client?.billing && !isInitialized) {
      if (adminSettings.client.billing.currency) {
        setCurrency(adminSettings.client.billing.currency);
      }
      if (adminSettings.client.billing.currency_symbol) {
        setCurrencySymbol(adminSettings.client.billing.currency_symbol);
      }
      if (adminSettings.client.billing.currency_symbol_position) {
        setCurrencyPosition(
          adminSettings.client.billing.currency_symbol_position === 'before'
            ? 'before'
            : 'after',
        );
      }
      setIsInitialized(true);
    }
  }, [adminSettings, isInitialized]);

  const updateSettings = useMutation(updateSettingsOptions());

  const sampleFormatted = useMemo(() => {
    const sym = currencySymbol.trim() || currency.trim() || 'Br';
    if (currencyPosition === 'before') {
      return `${sym} 250.00`;
    }
    return `250.00 ${sym}`;
  }, [currency, currencySymbol, currencyPosition]);

  const isDirty =
    currency !== initialCurrency ||
    currencySymbol !== initialSymbol ||
    currencyPosition !== initialPosition;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!currency.trim()) return;

    setStatusMsg(undefined);

    const clientPayload = {
      ...(adminSettings?.client || {}),
      billing: {
        ...(adminSettings?.client?.billing || billingSettings || {}),
        currency: currency.trim(),
        currency_symbol: currencySymbol.trim() || currency.trim(),
        currency_symbol_position: currencyPosition,
      },
    };

    updateSettings.mutate(
      {client: clientPayload} as any,
      {
        onSuccess: () => {
          // Update bootstrap store in-memory for instant feedback
          const currentBootstrap = getBootstrapData();
          if (currentBootstrap?.settings) {
            setBootstrapData({
              ...currentBootstrap,
              settings: {
                ...currentBootstrap.settings,
                billing: {
                  ...currentBootstrap.settings.billing,
                  currency: currency.trim(),
                  currency_symbol: currencySymbol.trim() || currency.trim(),
                  currency_symbol_position: currencyPosition,
                },
              },
            });
          }
          setStatusMsg({
            type: 'success',
            text: 'Site currency defaults updated successfully.',
          });
          toast.success(<Trans message="Currency settings saved" />);
        },
        onError: reason => {
          setStatusMsg({
            type: 'error',
            text: getApiErrorMessage(reason) || 'Failed to update currency settings.',
          });
        },
      },
    );
  };

  return (
    <Card.Root>
      <Card.Header>
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-input bg-primary/10 text-primary">
            <CoinsIcon className="size-5" />
          </div>
          <div>
            <Card.Title>
              <Trans message="Default Currency & Formatting" />
            </Card.Title>
            <Card.Description>
              <Trans message="Site-wide currency used for checkout pricing, creator payouts, withdrawal requests, and invoices." />
            </Card.Description>
          </div>
        </div>
      </Card.Header>

      <Card.Content className="space-y-6">
        {statusMsg && (
          <div
            role={statusMsg.type === 'error' ? 'alert' : 'status'}
            className={`flex items-center gap-2 rounded-input border p-3 text-sm ${
              statusMsg.type === 'error'
                ? 'border-destructive/40 bg-destructive/5 text-destructive'
                : 'border-positive/40 bg-positive/5 text-positive'
            }`}
          >
            {statusMsg.type === 'error' ? (
              <CircleAlertIcon className="size-4 shrink-0" />
            ) : (
              <CheckCircle2Icon className="size-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field.Root>
              <Field.Label htmlFor="currency-code">
                <Trans message="Currency code" />
              </Field.Label>
              <Input
                id="currency-code"
                value={currency}
                disabled={settingsLoading || updateSettings.isPending}
                onChange={e => setCurrency(e.target.value.toUpperCase())}
                placeholder="ETB"
                required
              />
              <Field.Description>
                <Trans message="Standard 3-letter currency code (e.g. ETB, USD)." />
              </Field.Description>
            </Field.Root>

            <Field.Root>
              <Field.Label htmlFor="currency-symbol">
                <Trans message="Currency symbol" />
              </Field.Label>
              <Input
                id="currency-symbol"
                value={currencySymbol}
                disabled={settingsLoading || updateSettings.isPending}
                onChange={e => setCurrencySymbol(e.target.value)}
                placeholder="Br"
                required
              />
              <Field.Description>
                <Trans message="Display symbol shown on prices (e.g. Br, $, €)." />
              </Field.Description>
            </Field.Root>

            <Field.Root>
              <Field.Label htmlFor="currency-position">
                <Trans message="Symbol position" />
              </Field.Label>
              <Select.Root
                items={positionOptions}
                value={currencyPosition}
                onValueChange={val => setCurrencyPosition(val as CurrencyPosition)}
                disabled={settingsLoading || updateSettings.isPending}
              >
                <Select.Trigger id="currency-position" className="w-full">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {positionOptions.map(opt => (
                    <Select.Item key={opt.value} value={opt.value}>
                      {opt.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select.Root>
              <Field.Description>
                <Trans message="Place symbol before or after the number." />
              </Field.Description>
            </Field.Root>
          </div>

          <div className="flex flex-col gap-2 rounded-input border bg-muted/30 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                <Trans message="Display preview:" />
              </span>{' '}
              <Trans message="How product pricing and creator payouts will appear to buyers and creators." />
            </div>
            <div className="rounded-card border bg-background px-3 py-1 font-mono text-sm font-semibold text-foreground">
              {sampleFormatted}
            </div>
          </div>

          <Button
            type="submit"
            color="primary"
            disabled={updateSettings.isPending || (!isDirty && !statusMsg)}
          >
            {updateSettings.isPending ? (
              <>
                <Spinner className="size-4" />
                <Trans message="Saving..." />
              </>
            ) : (
              <Trans message="Save currency defaults" />
            )}
          </Button>
        </form>
      </Card.Content>
    </Card.Root>
  );
}

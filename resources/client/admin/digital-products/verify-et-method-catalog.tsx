import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {AlertDialog} from '@shadcn/alert-dialog/alert-dialog';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {useCallback, useEffect, useState} from 'react';
import {BankLogo} from './bank-logo';

type Method = {
  id: number;
  code: string;
  display_name: string;
  creator_setup_enabled: boolean;
  checkout_enabled: boolean;
  operationally_suspended: boolean;
  accounts_count?: number;
  pending_accounts_count?: number;
  status_label?: string;
};

const supported = ['cbe', 'telebirr', 'cbebirr', 'boa', 'awash', 'dashen'];

export function VerifyEtMethodCatalog() {
  const [methods, setMethods] = useState<Method[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number>();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<Method>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/v1/admin/storefront/payment-method-catalog');
      setMethods(response.data.data ?? []);
      setError(undefined);
    } catch (reason) {
      setError(getApiErrorMessage(reason) || 'Unable to load payment methods.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const update = async (method: Method, changes: Partial<Method>) => {
    setBusyId(method.id);
    setSaved(false);
    try {
      const response = await apiClient.patch(
        `/api/v1/admin/storefront/payment-method-catalog/${method.id}`,
        changes,
      );
      setMethods(current =>
        current.map(item => (item.id === method.id ? {...item, ...response.data.data} : item)),
      );
      setError(undefined);
      setSaved(true);
    } catch (reason) {
      setError(getApiErrorMessage(reason) || 'Unable to update payment methods.');
    } finally {
      setBusyId(undefined);
    }
  };

  const visible = methods.filter(method => supported.includes(method.code));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold">
          <Trans message="Banks and wallets" />
        </h2>
        <p className="text-sm text-muted-foreground">
          <Trans message="Choose which methods creators can set up and buyers can use. Suspending a method pauses both without changing account approval." />
        </p>
      </div>
      {loading && (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-muted-foreground">
          <Trans message="Payment method updated." />
        </p>
      )}
      {!loading && !error && visible.length === 0 && (
        <p role="status" className="text-sm text-muted-foreground">
          <Trans message="No Verify.et payment methods are configured." />
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map(method => {
          const busy = busyId === method.id;
          return (
            <Card.Root key={method.id}>
              <Card.Content className="flex flex-col gap-3 p-4">
                <div className="flex items-start gap-3">
                  <BankLogo code={method.code} name={method.display_name} />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{method.display_name}</p>
                    <p className="text-xs text-muted-foreground uppercase">{method.code}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge
                        variant={
                          method.operationally_suspended
                            ? 'destructive'
                            : method.creator_setup_enabled || method.checkout_enabled
                              ? 'positive'
                              : 'outline'
                        }
                      >
                        {method.operationally_suspended ? (
                          <Trans message="Suspended" />
                        ) : method.creator_setup_enabled || method.checkout_enabled ? (
                          <Trans message="Available" />
                        ) : (
                          <Trans message="Disabled" />
                        )}
                      </Badge>
                      <Badge variant={method.creator_setup_enabled ? 'secondary' : 'outline'}>
                        {method.creator_setup_enabled ? (
                          <Trans message="Creator setup on" />
                        ) : (
                          <Trans message="Creator setup off" />
                        )}
                      </Badge>
                      <Badge variant={method.checkout_enabled ? 'secondary' : 'outline'}>
                        {method.checkout_enabled ? (
                          <Trans message="Checkout on" />
                        ) : (
                          <Trans message="Checkout off" />
                        )}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      <Trans
                        message=":total accounts · :pending pending review"
                        values={{
                          total: method.accounts_count ?? 0,
                          pending: method.pending_accounts_count ?? 0,
                        }}
                      />
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || method.operationally_suspended}
                    onClick={() =>
                      void update(method, {
                        creator_setup_enabled: !method.creator_setup_enabled,
                      })
                    }
                  >
                    {method.creator_setup_enabled ? (
                      <Trans message="Disable creator setup" />
                    ) : (
                      <Trans message="Enable creator setup" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy || method.operationally_suspended}
                    onClick={() =>
                      void update(method, {checkout_enabled: !method.checkout_enabled})
                    }
                  >
                    {method.checkout_enabled ? (
                      <Trans message="Disable checkout" />
                    ) : (
                      <Trans message="Enable checkout" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => {
                      if (method.operationally_suspended) {
                        void update(method, {operationally_suspended: false});
                      } else {
                        setSuspendTarget(method);
                      }
                    }}
                  >
                    {method.operationally_suspended ? (
                      <Trans message="Restore method" />
                    ) : (
                      <Trans message="Suspend method" />
                    )}
                  </Button>
                </div>
              </Card.Content>
            </Card.Root>
          );
        })}
      </div>

      <AlertDialog.Root
        open={!!suspendTarget}
        onOpenChange={open => {
          if (!open) setSuspendTarget(undefined);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Backdrop />
          <AlertDialog.Content>
            <AlertDialog.Header>
              <AlertDialog.Title>
                <Trans message="Suspend this payment method?" />
              </AlertDialog.Title>
              <AlertDialog.Description>
                <Trans message="Creators will not be able to set up new accounts and buyers will not see this method at checkout. Existing approved accounts stay recorded." />
              </AlertDialog.Description>
            </AlertDialog.Header>
            <AlertDialog.Footer>
              <AlertDialog.Cancel>
                <Trans message="Cancel" />
              </AlertDialog.Cancel>
              <AlertDialog.Action
                onClick={() => {
                  if (!suspendTarget) return;
                  void update(suspendTarget, {operationally_suspended: true});
                  setSuspendTarget(undefined);
                }}
              >
                <Trans message="Suspend method" />
              </AlertDialog.Action>
            </AlertDialog.Footer>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </div>
  );
}

import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Spinner} from '@shadcn/spinner/spinner';
import {apiClient} from '@common/http/query-client';
import {formatMoney} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {CheckCircle2Icon, CopyIcon} from 'lucide-react';
import {ReactNode, useCallback, useEffect, useState} from 'react';
import {Link} from 'react-router';

export type DirectCheckout = {
  order_id: string;
  access_token: string;
  status_endpoint: string;
  reference_endpoint: string;
  status: string;
  instructions_endpoint: string;
};

type PaymentInstructions = {
  provider: string;
  account_number: string;
  account_name: string;
  amount_cents: number;
  currency: string;
};

type PaidDownload = {name: string; remaining_downloads: number; url: string};

export function DirectPaymentModal({
  checkout,
  onClose,
}: {
  checkout: DirectCheckout | null;
  onClose: () => void;
}) {
  const [instructions, setInstructions] = useState<PaymentInstructions | null>(null);
  const [reference, setReference] = useState('');
  const [accountSuffix, setAccountSuffix] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [status, setStatus] = useState(checkout?.status ?? '');
  const [downloads, setDownloads] = useState<PaidDownload[]>([]);
  const [busy, setBusy] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [error, setError] = useState(false);
  const [instructionsError, setInstructionsError] = useState(false);

  useEffect(() => {
    setInstructions(null);
    setStatus(checkout?.status ?? '');
    setReference('');
    setAccountSuffix('');
    setPhoneNumber('');
    setError(false);
    setInstructionsError(false);
    setDownloads([]);
  }, [checkout]);

  const refreshOrder = useCallback(async () => {
    if (!checkout) return;
    const response = await apiClient.get(
      `/api/v1/public/direct-orders/${checkout.order_id}`,
      {headers: {'X-Order-Access-Token': checkout.access_token, 'Cache-Control': 'no-store'}},
    );
    const order = response.data.data;
    setStatus(order?.status ?? response.data.status);
    setDownloads(order?.downloads ?? []);
  }, [checkout]);

  useEffect(() => {
    if (checkout?.status !== 'paid') return;
    void refreshOrder().catch(() => setError(true));
  }, [checkout, refreshOrder]);

  useEffect(() => {
    if (!checkout || checkout.status === 'paid') return;
    let active = true;
    const loadInstructions = async (attempt = 0): Promise<void> => {
      try {
        const response = await apiClient.get(checkout.instructions_endpoint, {
          headers: {'X-Order-Access-Token': checkout.access_token, 'Cache-Control': 'no-store'},
        });
        if (active) setInstructions(response.data.data);
      } catch {
        if (!active) return;
        if (attempt < 3) {
          await new Promise(resolve => window.setTimeout(resolve, 400 * (attempt + 1)));
          if (active) await loadInstructions(attempt + 1);
          return;
        }
        setInstructionsError(true);
      }
    };
    void loadInstructions();
    return () => { active = false; };
  }, [checkout]);

  useEffect(() => {
    if (!checkout || !['verifying', 'manual_review'].includes(status)) return;
    const refresh = async () => {
      try {
        await refreshOrder();
      } catch {
        setError(true);
      }
    };
    const interval = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(interval);
  }, [checkout, refreshOrder, status]);

  const submitReference = async () => {
    if (!checkout || !instructions || !reference.trim()) return;
    const needsSuffix = instructions?.provider === 'boa'
      || (instructions?.provider === 'cbe' && /^FT/i.test(reference.trim()));
    if ((needsSuffix && !/^\d{5}$/.test(accountSuffix) && instructions?.provider === 'boa')
      || (needsSuffix && !/^\d{8}$/.test(accountSuffix) && instructions?.provider === 'cbe')
      || (instructions?.provider === 'cbebirr' && !/^(?:0\d{9}|\+251\d{9})$/.test(phoneNumber))) {
      setError(true);
      return;
    }
    setBusy(true);
    setError(false);
    try {
      const response = await apiClient.post(
        checkout.reference_endpoint,
        {
          reference: reference.trim(),
          account_suffix: needsSuffix ? accountSuffix : undefined,
          phone_number: instructions.provider === 'cbebirr' ? phoneNumber : undefined,
        },
        {headers: {'X-Order-Access-Token': checkout.access_token}},
      );
      setStatus(response.data.status);
      if (response.data.status === 'paid') {
        await refreshOrder();
      }
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const recheckStatus = async () => {
    if (!checkout || rechecking) return;
    setRechecking(true);
    setError(false);
    try {
      const response = await apiClient.post(
        `/api/v1/public/direct-orders/${checkout.order_id}/recheck`,
        {},
        {headers: {'X-Order-Access-Token': checkout.access_token}},
      );
      setStatus(response.data.status);
      if (response.data.status === 'paid') {
        await refreshOrder();
      }
    } catch {
      setError(true);
    } finally {
      setRechecking(false);
    }
  };

  const canSubmitReference = status === 'pending_payment'
    || status === 'failed_verification'
    || status === 'expired';

  return (
    <Dialog.Root open={!!checkout} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="max-h-[min(100dvh,40rem)] w-[calc(100vw-1.5rem)] overflow-y-auto sm:max-w-md">
          <Dialog.Header>
            <Dialog.Title>
              <Trans message="Pay the creator directly" />
            </Dialog.Title>
            <Dialog.Description>
              <Trans message="Transfer the exact amount to this account, then enter your transaction reference." />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body className="flex flex-col gap-4">
            {status && (
              <div className="flex flex-wrap items-center gap-2" data-testid="buyer-payment-status">
                <Badge variant={statusBadgeVariant(status)}>{buyerPaymentStatusLabel(status)}</Badge>
              </div>
            )}
            {instructions && status !== 'paid' && (
              <div className="flex flex-col gap-2 rounded-card bg-muted p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground"><Trans message="Bank or wallet" /></span>
                  <span className="font-medium uppercase">{instructions.provider}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground"><Trans message="Account name" /></span>
                  <span className="font-medium text-end">{instructions.account_name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground"><Trans message="Account number" /></span>
                  <span className="flex items-center gap-2 font-medium tabular-nums">
                    {instructions.account_number}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Copy account number"
                      onClick={() => void navigator.clipboard.writeText(instructions!.account_number)}
                    ><CopyIcon /></Button>
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-2">
                  <span className="text-muted-foreground"><Trans message="Exact amount" /></span>
                  <span className="font-semibold tabular-nums">
                    {formatMoney(instructions.amount_cents, instructions.currency)}
                  </span>
                </div>
              </div>
            )}
            {status === 'paid' ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-positive">
                  <CheckCircle2Icon className="size-5" />
                  <Trans message="Payment confirmed. Your purchased files are ready to download." />
                </div>
                {downloads.map(download => (
                  <a
                    key={download.url}
                    className="flex min-h-11 items-center justify-between gap-3 rounded-card-sm border border-border px-3 py-2 text-sm font-medium underline-offset-4 hover:underline"
                    href={download.url}
                  >
                    <span className="break-all">{download.name}</span>
                    <span className="shrink-0 text-muted-foreground">{download.remaining_downloads} <Trans message="downloads left" /></span>
                  </a>
                ))}
                <p className="text-sm text-muted-foreground">
                  <Trans message="You can also retrieve these files later from My Purchases. If a download is interrupted, return here or to your purchase library and try again." />
                </p>
                <Link className="text-sm text-primary underline" to="/my-portal">
                  <Trans message="Open My Purchases" />
                </Link>
              </div>
            ) : (
              <>
                {canSubmitReference && (
                  <>
                    <Field.Root>
                      <Field.Label><Trans message="Transaction reference" /></Field.Label>
                      <Input
                        bindToHookForm={false}
                        value={reference}
                        onChange={event => setReference(event.target.value)}
                        disabled={busy}
                        autoComplete="off"
                      />
                      <Field.Description>
                        <Trans message="Find this reference in your bank or wallet confirmation." />
                      </Field.Description>
                    </Field.Root>
                    {(instructions?.provider === 'boa'
                      || (instructions?.provider === 'cbe' && /^FT/i.test(reference.trim()))) && (
                      <Field.Root>
                        <Field.Label>{instructions.provider === 'boa' ? <Trans message="Five-digit transaction account suffix" /> : <Trans message="Eight-digit CBE FT suffix" />}</Field.Label>
                        <Input bindToHookForm={false} inputMode="numeric" value={accountSuffix} onChange={event => setAccountSuffix(event.target.value.replace(/\D/g, ''))} maxLength={instructions.provider === 'boa' ? 5 : 8} disabled={busy} />
                      </Field.Root>
                    )}
                    {instructions?.provider === 'cbebirr' && (
                      <Field.Root>
                        <Field.Label><Trans message="CBE Birr phone number" /></Field.Label>
                        <Input bindToHookForm={false} inputMode="tel" value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} disabled={busy} />
                      </Field.Root>
                    )}
                  </>
                )}
                {status === 'pending_payment' && (
                  <p className="text-sm text-muted-foreground">
                    <Trans message="Awaiting payment. Transfer the exact amount shown above before submitting your transaction reference." />
                  </p>
                )}
                {status === 'verifying' && (
                  <p className="text-sm text-muted-foreground">
                    <Trans message="Verifying your payment with the provider. Access stays locked until verification is complete." />
                  </p>
                )}
                {status === 'verifying' && (
                  <p className="text-sm text-muted-foreground">
                    <Trans message="Bank confirmations can take a few minutes. Keep this page open or use Check payment status. Do not pay again for the same order." />
                  </p>
                )}
                {status === 'manual_review' && (
                  <p className="text-sm text-muted-foreground">
                    <Trans message="Needs review. The provider has not supplied enough evidence yet, so your order remains unpaid and locked." />
                  </p>
                )}
                {status === 'manual_review' && (
                  <p className="text-sm text-muted-foreground">
                    <Trans message="You do not need to pay again. We will unlock downloads automatically once review finishes." />
                  </p>
                )}
                {status === 'failed_verification' && (
                  <p className="text-sm text-destructive">
                    <Trans message="Payment was not verified. Check that the reference is correct and the exact amount was sent to the account shown. You can submit corrected details." />
                  </p>
                )}
                {status === 'failed_verification' && (
                  <p className="text-sm text-muted-foreground">
                    <Trans message="Common causes: wrong recipient account, incorrect reference, or a delayed bank posting. Fix the details above, then verify again." />
                  </p>
                )}
                {instructionsError && !instructions && (
                  <p className="text-sm text-destructive">
                    <Trans message="Payment details could not be loaded. Close this window and start checkout again." />
                  </p>
                )}
                {error && (
                  <p className="text-sm text-destructive">
                    <Trans message="Check the reference and any required bank details, then try again. If this reference was already used, request a new payment confirmation from your bank." />
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  <Trans message="Lost this page? Recover paid downloads later from" />{' '}
                  <Link className="text-primary underline" to="/my-portal">
                    <Trans message="My Purchases" />
                  </Link>
                  .
                </p>
              </>
            )}
          </Dialog.Body>
          <Dialog.Footer className="flex flex-wrap gap-2">
            <Button variant="ghost" onClick={onClose}><Trans message="Close" /></Button>
            {status === 'verifying' && (
              <Button variant="outline" onClick={() => void recheckStatus()} disabled={rechecking}>
                {rechecking && <Spinner />}
                <Trans message="Check payment status" />
              </Button>
            )}
            {canSubmitReference && (
              <Button onClick={() => void submitReference()} disabled={busy || !instructions || !reference.trim()}>
                {busy && <Spinner />}
                <Trans message="Verify payment" />
              </Button>
            )}
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function buyerPaymentStatusLabel(status: string): ReactNode {
  switch (status) {
    case 'pending_payment':
      return <Trans message="Pending payment" />;
    case 'verifying':
      return <Trans message="Verifying" />;
    case 'manual_review':
      return <Trans message="Manual review" />;
    case 'failed_verification':
      return <Trans message="Rejected" />;
    case 'paid':
    case 'fulfilled':
      return <Trans message="Paid" />;
    case 'expired':
      return <Trans message="Expired" />;
    default:
      return <Trans message="Status unavailable" />;
  }
}

function statusBadgeVariant(status: string): 'positive' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
    case 'fulfilled':
      return 'positive';
    case 'failed_verification':
      return 'destructive';
    case 'manual_review':
    case 'verifying':
      return 'secondary';
    default:
      return 'outline';
  }
}

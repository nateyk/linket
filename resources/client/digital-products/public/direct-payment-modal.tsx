import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Dialog} from '@shadcn/dialog/dialog';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {Spinner} from '@shadcn/spinner/spinner';
import {apiClient} from '@common/http/query-client';
import {formatMoney} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  CopyIcon,
  DownloadIcon,
  LockIcon,
  RefreshCwIcon,
} from 'lucide-react';
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

export type ReceivingAccount = {
  id: number;
  provider: string;
  bank_name?: string;
  account_number: string;
  account_ending: string;
  account_name: string;
  instructions?: string;
};

type PaymentInstructions = {
  receiving_account_id?: number;
  provider: string;
  bank_name?: string;
  account_number: string;
  account_name: string;
  amount_cents: number;
  currency: string;
  instructions?: string;
  available_accounts?: ReceivingAccount[];
  verification_attempts?: number;
  attempts_remaining?: number;
  session_locked?: boolean;
};

type PaidDownload = {
  name: string;
  remaining_downloads: number;
  download_limit?: number;
  download_count?: number;
  expires_at?: string;
  url: string;
};

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
  const [status, setStatus] = useState(checkout?.status ?? '');
  const [deliveryStatus, setDeliveryStatus] = useState<'awaiting_payment' | 'delivering' | 'delivered' | 'failed'>('awaiting_payment');
  const [downloads, setDownloads] = useState<PaidDownload[]>([]);
  const [busy, setBusy] = useState(false);
  const [rechecking, setRechecking] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [instructionsError, setInstructionsError] = useState(false);
  const [instructionsRetry, setInstructionsRetry] = useState(0);
  const [copied, setCopied] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(5);
  const [sessionLocked, setSessionLocked] = useState(false);

  useEffect(() => {
    setInstructions(null);
    setStatus(checkout?.status ?? '');
    setDeliveryStatus('awaiting_payment');
    setReference('');
    setAccountSuffix('');
    setErrorMessage(null);
    setValidationError(null);
    setInstructionsError(false);
    setDownloads([]);
    setAttemptsRemaining(5);
    setSessionLocked(false);
  }, [checkout]);

  const refreshOrder = useCallback(async () => {
    if (!checkout) return;
    const response = await apiClient.get(
      `/api/v1/public/direct-orders/${checkout.order_id}`,
      {headers: {'X-Order-Access-Token': checkout.access_token, 'Cache-Control': 'no-store'}},
    );
    const order = response.data.data ?? response.data;
    const orderStatus = order?.status ?? response.data.status;
    setStatus(orderStatus);
    setDeliveryStatus(order?.delivery_status ?? (orderStatus === 'paid' ? 'delivered' : 'awaiting_payment'));
    setDownloads(order?.downloads ?? []);
    if (typeof order?.attempts_remaining === 'number') {
      setAttemptsRemaining(order.attempts_remaining);
    }
    if (typeof order?.session_locked === 'boolean') {
      setSessionLocked(order.session_locked);
    }
  }, [checkout]);

  useEffect(() => {
    if (checkout?.status !== 'paid') return;
    void refreshOrder().catch(() => setErrorMessage('Failed to load order access details.'));
  }, [checkout, refreshOrder]);

  // Load instructions and available receiving accounts
  useEffect(() => {
    if (!checkout || checkout.status === 'paid') return;
    let active = true;
    const loadInstructions = async (attempt = 0): Promise<void> => {
      try {
        const response = await apiClient.get(checkout.instructions_endpoint, {
          headers: {'X-Order-Access-Token': checkout.access_token, 'Cache-Control': 'no-store'},
        });
        if (active) {
          const data: PaymentInstructions = response.data.data ?? response.data;
          setInstructions(data);
          setInstructionsError(false);
          if (data.status) setStatus(data.status);
          if (typeof data.attempts_remaining === 'number') {
            setAttemptsRemaining(data.attempts_remaining);
          }
          if (typeof data.session_locked === 'boolean') {
            setSessionLocked(data.session_locked);
          }
        }
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
  }, [checkout, instructionsRetry]);

  // Polling for verifying, manual review, or delivering state
  useEffect(() => {
    if (!checkout) return;
    const isVerifying = ['verifying', 'manual_review'].includes(status);
    const isDelivering = (status === 'paid' || status === 'completed') && deliveryStatus === 'delivering';
    if (!isVerifying && !isDelivering) return;

    const refresh = async () => {
      try {
        await refreshOrder();
      } catch {
        // silent background poll error
      }
    };

    const intervalMs = isDelivering ? 2000 : 8000;
    const interval = window.setInterval(() => void refresh(), intervalMs);
    return () => window.clearInterval(interval);
  }, [checkout, refreshOrder, status, deliveryStatus]);

  // Switch receiving account dynamically
  const selectReceivingAccount = async (accountId: number) => {
    if (!checkout || busy || switchingAccount) return;
    setSwitchingAccount(true);
    setErrorMessage(null);
    try {
      const response = await apiClient.post(
        `/api/v1/public/direct-orders/${checkout.order_id}/select-account`,
        {receiving_account_id: accountId},
        {headers: {'X-Order-Access-Token': checkout.access_token}},
      );
      const data: PaymentInstructions = response.data.data ?? response.data;
      setInstructions(data);
      setReference('');
      setAccountSuffix('');
      setValidationError(null);
    } catch {
      setErrorMessage('Failed to switch receiving account. Please try again.');
    } finally {
      setSwitchingAccount(false);
    }
  };

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  // Pre-verification validation
  const validateBeforeSubmit = (): boolean => {
    setValidationError(null);
    const cleanRef = reference.trim();
    if (!cleanRef) {
      setValidationError('Please enter the receipt ID or transaction reference from your completed transfer.');
      return false;
    }

    if (instructions?.account_number
      && cleanRef.replace(/[\s-]+/g, '').toLowerCase()
        === instructions.account_number.replace(/[\s-]+/g, '').toLowerCase()) {
      setValidationError('This is the receiving account number, not a payment reference. Find the receipt ID on your completed bank or wallet transfer.');
      return false;
    }

    const provider = instructions?.provider?.toLowerCase();
    const isCbeFt = provider === 'cbe' && /^FT[0-9A-Z]{8,12}$/i.test(cleanRef);

    if (provider === 'boa') {
      if (!accountSuffix.trim()) {
        setValidationError('Bank of Abyssinia requires your 5-digit transaction account suffix.');
        return false;
      }
      if (!/^\d{5}$/.test(accountSuffix.trim())) {
        setValidationError('Account suffix must be exactly 5 digits for Bank of Abyssinia.');
        return false;
      }
    }

    if (isCbeFt) {
      if (!accountSuffix.trim()) {
        setValidationError('CBE FT references require your 8-digit transaction account suffix.');
        return false;
      }
      if (!/^\d{8}$/.test(accountSuffix.trim())) {
        setValidationError('Account suffix must be exactly 8 digits for CBE FT transactions.');
        return false;
      }
    }

    return true;
  };

  const submitReference = async () => {
    if (!checkout || !instructions || sessionLocked || busy) return;
    if (!validateBeforeSubmit()) return;

    const provider = instructions.provider?.toLowerCase();
    const cleanRef = reference.trim();
    const isCbeFt = provider === 'cbe' && /^FT[0-9A-Z]{8,12}$/i.test(cleanRef);
    const needsSuffix = provider === 'boa' || isCbeFt;

    setBusy(true);
    setErrorMessage(null);
    setValidationError(null);

    try {
      const response = await apiClient.post(
        checkout.reference_endpoint,
        {
          reference: cleanRef,
          account_suffix: needsSuffix ? accountSuffix.trim() : undefined,
        },
        {headers: {'X-Order-Access-Token': checkout.access_token}},
      );

      const respData = response.data;
      const newStatus = respData.status ?? 'verifying';
      setStatus(newStatus);

      if (typeof respData.attempts_remaining === 'number') {
        setAttemptsRemaining(respData.attempts_remaining);
      }
      if (typeof respData.session_locked === 'boolean') {
        setSessionLocked(respData.session_locked);
      }
      if (respData.delivery_status) {
        setDeliveryStatus(respData.delivery_status);
      }

      if (newStatus === 'paid' || newStatus === 'completed') {
        await refreshOrder();
      }
    } catch (err: any) {
      const res = err?.response?.data;
      if (res) {
        if (typeof res.attempts_remaining === 'number') {
          setAttemptsRemaining(res.attempts_remaining);
        }
        if (typeof res.session_locked === 'boolean') {
          setSessionLocked(res.session_locked);
        }
        if (res.status) {
          setStatus(res.status);
        }
        const fieldError = res.errors?.reference?.[0] || res.errors?.account_suffix?.[0];
        if (fieldError) {
          setValidationError(fieldError);
          setErrorMessage(null);
        } else {
          setErrorMessage(res.message || 'Verification failed. Please check your reference and try again.');
        }
      } else {
        setErrorMessage('A network error occurred while verifying payment. Please retry.');
      }
    } finally {
      setBusy(false);
    }
  };

  const recheckStatus = async () => {
    if (!checkout || rechecking) return;
    setRechecking(true);
    setErrorMessage(null);
    try {
      const response = await apiClient.post(
        `/api/v1/public/direct-orders/${checkout.order_id}/recheck`,
        {},
        {headers: {'X-Order-Access-Token': checkout.access_token}},
      );
      const data = response.data;
      setStatus(data.status);
      if (data.delivery_status) {
        setDeliveryStatus(data.delivery_status);
      }
      if (typeof data.attempts_remaining === 'number') {
        setAttemptsRemaining(data.attempts_remaining);
      }
      if (typeof data.session_locked === 'boolean') {
        setSessionLocked(data.session_locked);
      }
      if (data.status === 'paid' || data.status === 'completed') {
        await refreshOrder();
      }
    } catch {
      setErrorMessage('Could not check status right now. Please try again shortly.');
    } finally {
      setRechecking(false);
    }
  };

  const canSubmitReference = !sessionLocked
    && (status === 'pending_payment'
      || status === 'pending'
      || status === 'failed_verification'
      || status === 'failed'
      || (status === 'expired' && attemptsRemaining > 0));

  const availableAccounts = instructions?.available_accounts ?? [];

  return (
    <Dialog.Root open={!!checkout} onOpenChange={open => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="max-h-[min(100dvh,40rem)] w-[calc(100vw-1.5rem)] overflow-y-auto sm:max-w-md">
          <Dialog.Header>
            <p className="text-xs font-medium text-muted-foreground"><Trans message="Step 2 of 2 · Transfer and verification" /></p>
            <Dialog.Title>
              <Trans message="Pay the creator directly" />
            </Dialog.Title>
            <Dialog.Description>
              {canSubmitReference
                ? <Trans message="Pay the amount shown below, then enter the receipt ID from your transfer confirmation." />
                : status === 'paid' || status === 'completed'
                  ? <Trans message="Your payment is confirmed. Check your download access below." />
                  : <Trans message="Track the verification of your existing payment. Do not transfer again." />}
            </Dialog.Description>
          </Dialog.Header>

          <Dialog.Body className="flex flex-col gap-4">
            {/* Status & Attempt Indicator */}
            {status && (
              <div className="flex flex-wrap items-center justify-between gap-2" data-testid="buyer-payment-status">
                <Badge variant={statusBadgeVariant(status)}>{buyerPaymentStatusLabel(status)}</Badge>
                {status !== 'paid' && status !== 'completed' && (
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {sessionLocked ? (
                      <span className="flex items-center gap-1 text-destructive font-medium">
                        <LockIcon className="size-3" />
                        <Trans message="Session locked (0 attempts left)" />
                      </span>
                    ) : (
                      <Trans message="Attempts remaining: :count of 5" values={{count: attemptsRemaining}} />
                    )}
                  </span>
                )}
              </div>
            )}

            {/* Dynamic Receiving Account Selector */}
            {instructions && canSubmitReference && (
              <div className="flex flex-col gap-3 rounded-card bg-muted/70 p-4 text-sm border border-border">
                {availableAccounts.length > 1 && attemptsRemaining === 5 && (
                  <div className="flex flex-col gap-1.5 pb-3 border-b border-border">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <Trans message="Select receiving bank / account" />
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {availableAccounts.map(acc => {
                        const isSelected = acc.id === instructions.receiving_account_id
                          || (!instructions.receiving_account_id && acc.provider === instructions.provider);
                        return (
                          <button
                            key={acc.id}
                            type="button"
                            disabled={switchingAccount || busy}
                            onClick={() => void selectReceivingAccount(acc.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-card-sm text-xs font-medium border transition-colors ${
                              isSelected
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background hover:bg-muted text-foreground border-border'
                            }`}
                          >
                            <span>{acc.bank_name || acc.provider.toUpperCase()}</span>
                            <span className="opacity-75">(*{acc.account_ending})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground"><Trans message="Bank or wallet" /></span>
                  <span className="font-medium">{instructions.bank_name || instructions.provider.toUpperCase()}</span>
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
                      onClick={() => copyToClipboard(instructions.account_number)}
                    >
                      <CopyIcon className="size-3.5" />
                    </Button>
                    {copied && <span className="text-xs text-positive font-medium"><Trans message="Copied!" /></span>}
                  </span>
                </div>
                <div className="flex justify-between gap-4 border-t border-border pt-2">
                  <span className="text-muted-foreground"><Trans message="Exact amount" /></span>
                  <span className="font-semibold tabular-nums text-base">
                    {formatMoney(instructions.amount_cents, instructions.currency)}
                  </span>
                </div>

                {instructions.instructions && (
                  <p className="text-xs text-muted-foreground pt-1 border-t border-border/50 italic">
                    {instructions.instructions}
                  </p>
                )}
              </div>
            )}

            {/* Post-Payment Digital Delivery State */}
            {status === 'paid' || status === 'completed' ? (
              <div className="flex flex-col gap-4">
                {deliveryStatus === 'delivering' ? (
                  <div className="flex items-center gap-3 rounded-card bg-muted p-4 text-sm">
                    <Spinner className="size-5 text-primary shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">
                        <Trans message="Payment confirmed! Preparing your digital download..." />
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <Trans message="Access links are being generated. This takes only a moment." />
                      </p>
                    </div>
                  </div>
                ) : deliveryStatus === 'failed' ? (
                  <div className="flex items-start gap-3 rounded-card bg-destructive/10 p-4 text-sm text-destructive">
                    <AlertCircleIcon className="size-5 shrink-0" />
                    <p>
                      <Trans message="Payment received. Your files are not ready yet. Return to this checkout or My Purchases shortly." />
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-positive font-medium">
                      <CheckCircle2Icon className="size-5 shrink-0" />
                      <Trans message="Payment confirmed. Your purchased files are ready to download." />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span><Trans message="Delivery status:" /> <strong className="text-positive uppercase">Delivered</strong></span>
                      {downloads.length > 0 && <span>{downloads.length} <Trans message="file(s) available" /></span>}
                    </div>

                    <div className="flex flex-col gap-2">
                      {downloads.map(download => (
                        <a
                          key={download.url}
                          className="flex min-h-12 items-center justify-between gap-3 rounded-card border border-border bg-card px-3.5 py-2.5 text-sm font-medium hover:bg-muted transition-colors"
                          href={download.url}
                          download
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <DownloadIcon className="size-4 shrink-0 text-primary" />
                            <span className="truncate">{download.name}</span>
                          </div>
                          <span className="shrink-0 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {download.remaining_downloads} <Trans message="downloads left" />
                          </span>
                        </a>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      <Trans message="You can also retrieve these files later from My Purchases. If a download is interrupted, return here or to your purchase library and try again." />
                    </p>
                    <Link className="text-sm text-primary underline font-medium" to="/my-portal">
                      <Trans message="Open My Purchases" />
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Reference Input Form */}
                {canSubmitReference && (
                  <div className="flex flex-col gap-3">
                    <Field.Root>
                      <Field.Label><Trans message="Receipt ID / transaction reference" /></Field.Label>
                      <Input
                        bindToHookForm={false}
                        value={reference}
                        onChange={event => {
                          setReference(event.target.value);
                           setErrorMessage(null);
                          setValidationError(null);
                        }}
                        placeholder="e.g. fHCxyTVljBclm6Yk4C or FT..."
                         aria-invalid={!!validationError}
                         aria-describedby="buyer-payment-reference-help"
                        disabled={busy}
                        autoComplete="off"
                      />
                      <Field.Description>
                        <span id="buyer-payment-reference-help"><Trans message="Use the receipt ID from your completed transfer, not the receiving account number above." /></span>
                      </Field.Description>
                    </Field.Root>

                    {(instructions?.provider === 'boa'
                      || (instructions?.provider === 'cbe' && /^FT[0-9A-Z]{8,12}$/i.test(reference.trim()))) && (
                      <Field.Root>
                        <Field.Label>
                          {instructions.provider === 'boa'
                            ? <Trans message="Five-digit transaction account suffix" />
                            : <Trans message="Eight-digit CBE FT suffix" />}
                        </Field.Label>
                        <Input
                          bindToHookForm={false}
                          inputMode="numeric"
                          value={accountSuffix}
                          onChange={event => {
                            setAccountSuffix(event.target.value.replace(/\D/g, ''));
                            setValidationError(null);
                          }}
                          placeholder={instructions.provider === 'boa' ? '12345' : '12345678'}
                          maxLength={instructions.provider === 'boa' ? 5 : 8}
                          disabled={busy}
                        />
                      </Field.Root>
                    )}
                  </div>
                )}

                {/* Validation and Error Alerts */}
                {validationError && (
                  <div className="flex items-center gap-2 rounded-card bg-destructive/10 p-3 text-xs text-destructive">
                    <AlertCircleIcon className="size-4 shrink-0" />
                    <span role="alert">{validationError}</span>
                  </div>
                )}

                {errorMessage && (
                  <div className="flex items-center gap-2 rounded-card bg-destructive/10 p-3 text-xs text-destructive">
                    <AlertCircleIcon className="size-4 shrink-0" />
                    <span role="alert">{errorMessage}</span>
                  </div>
                )}

                {sessionLocked && (
                  <div className="flex items-center gap-2 rounded-card bg-destructive/10 p-3 text-xs text-destructive font-medium">
                    <LockIcon className="size-4 shrink-0" />
                    <span><Trans message="Maximum verification attempts exceeded. This checkout session has been cancelled." /></span>
                  </div>
                )}

                {/* Status Guidance Messages */}
                {(status === 'pending_payment' || status === 'pending') && !sessionLocked && (
                  <p className="text-xs text-muted-foreground">
                    <Trans message="Awaiting payment. Transfer the exact amount shown above before submitting your transaction reference. Access stays locked until verification is complete." />
                  </p>
                )}

                {status === 'verifying' && (
                  <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5 font-medium text-foreground">
                      <Spinner className="size-3.5 text-primary" />
                      <span role="status"><Trans message="Verifying your payment with the provider." /></span>
                    </p>
                    <p>
                      <Trans message="Bank confirmations can take a few minutes. Keep this page open or use Check payment status. Do not pay again for the same order." />
                    </p>
                  </div>
                )}

                {status === 'manual_review' && (
                  <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">
                      <Trans message="Needs review. The provider has not supplied enough evidence yet, so your order remains unpaid and locked." />
                    </p>
                    <p>
                      <Trans message="You do not need to pay again. We will unlock downloads automatically once review finishes." />
                    </p>
                  </div>
                )}

                {(status === 'failed_verification' || status === 'failed') && !sessionLocked && (
                  <div className="flex flex-col gap-1 text-xs text-destructive">
                    <p className="font-medium">
                      <Trans message="Payment was not verified. Check that the reference is correct and the exact amount was sent to the account shown. You can submit corrected details." />
                    </p>
                    <p className="text-muted-foreground">
                      <Trans message="Common causes: wrong recipient account, incorrect reference, or a delayed bank posting. Fix details above, then verify again." />
                    </p>
                  </div>
                )}

                {instructionsError && !instructions && (
                  <div role="alert" className="flex flex-col gap-2 rounded-card border border-destructive/20 p-3 text-sm text-destructive">
                    <Trans message="Payment details could not be loaded. Your order is still available." />
                    <Button variant="outline" onClick={() => { setInstructionsError(false); setInstructionsRetry(value => value + 1); }}>
                      <RefreshCwIcon className="size-4" />
                      <Trans message="Retry loading payment details" />
                    </Button>
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
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
                {rechecking ? <Spinner className="size-4" /> : <RefreshCwIcon className="size-3.5" />}
                <Trans message="Check payment status" />
              </Button>
            )}

            {canSubmitReference && (
              <Button
                onClick={() => void submitReference()}
                disabled={busy || !instructions || !reference.trim() || sessionLocked}
              >
                {busy && <Spinner className="size-4" />}
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
    case 'pending':
      return <Trans message="Pending payment" />;
    case 'verifying':
      return <Trans message="Verifying" />;
    case 'manual_review':
      return <Trans message="Manual review" />;
    case 'failed_verification':
    case 'failed':
      return <Trans message="Rejected" />;
    case 'paid':
    case 'completed':
    case 'fulfilled':
      return <Trans message="Paid" />;
    case 'expired':
    case 'cancelled':
      return <Trans message="Expired" />;
    default:
      return <Trans message="Status unavailable" />;
  }
}

function statusBadgeVariant(status: string): 'positive' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'paid':
    case 'completed':
    case 'fulfilled':
      return 'positive';
    case 'failed_verification':
    case 'failed':
      return 'destructive';
    case 'manual_review':
    case 'verifying':
      return 'secondary';
    default:
      return 'outline';
  }
}

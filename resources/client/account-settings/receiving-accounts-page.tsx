import {AccountSettingsPageLayout} from '@app/account-settings/account-settings-page-layout';
import {apiClient} from '@common/http/query-client';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Empty} from '@shadcn/empty/empty';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Popover} from '@shadcn/popover/popover';
import {Spinner} from '@shadcn/spinner/spinner';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {
  InfoIcon,
  LandmarkIcon,
  MoreHorizontalIcon,
  PlusIcon,
  PowerIcon,
  UploadIcon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import awash from './bank-logos/awash.svg';
import boa from './bank-logos/boa.svg';
import cbe from './bank-logos/cbe.svg';
import cbebirr from './bank-logos/cbebirr.svg';
import dashen from './bank-logos/dashen.svg';
import telebirr from './bank-logos/telebirr.svg';

type Account = {
  id: number;
  provider: string;
  account_ending: string;
  account_name: string;
  status: string;
  is_active: boolean;
  is_suspended: boolean;
  provider_registration_status: string;
  checkout_eligible: boolean;
  checkout_blocker?: string | null;
};

type Provider = {code: string; name: string};

const MAX_PROOF_SIZE = 5 * 1024 * 1024;
const logos: Record<string, string> = {awash, boa, cbe, cbebirr, dashen, telebirr};

function BankLogo({
  code,
  name,
  compact = false,
  decorative = false,
  frosted = false,
}: {
  code: string;
  name: string;
  compact?: boolean;
  decorative?: boolean;
  frosted?: boolean;
}) {
  return (
    <span
      className={
        frosted
          ? 'flex size-12 shrink-0 items-center justify-center rounded-card-sm border border-border/70 bg-background/80 p-2 backdrop-blur-sm'
          : compact
            ? 'flex size-8 shrink-0 items-center justify-center rounded-input border border-border bg-background p-1'
            : 'flex size-11 shrink-0 items-center justify-center rounded-card-sm border border-border bg-background p-1.5'
      }
    >
      {logos[code] ? (
        <img
          src={logos[code]}
          alt={decorative ? '' : name}
          className="size-full object-contain"
        />
      ) : (
        <LandmarkIcon
          className="size-5 text-muted-foreground"
          role={decorative ? undefined : 'img'}
          aria-label={decorative ? undefined : name}
          aria-hidden={decorative ? true : undefined}
        />
      )}
    </span>
  );
}

function isValidAccountNumber(number: string, provider: string): boolean {
  const trimmed = number.trim();
  const normalized = trimmed.replace(/[\s-]+/g, '');
  if (!/^[0-9+ -]{8,100}$/.test(trimmed)) return false;
  if (provider === 'telebirr') {
    return /^(?:0\d{9}|\+251\d{9})$/.test(normalized);
  }
  if (provider === 'awash') return /^\d{14}$/.test(normalized);
  if (provider === 'boa') return /^(?:\d{8}|\d{16})$/.test(normalized);
  return true;
}

function AccountLifecycleBadge({account}: {account: Account}) {
  const approved = account.status === 'approved';
  const registered = account.provider_registration_status === 'registered';

  const label = account.is_suspended ? (
    <Trans message="Suspended" />
  ) : account.status === 'rejected' ? (
    <Trans message="Rejected" />
  ) : !approved ? (
    <Trans message="Pending review" />
  ) : !registered ? (
    <Trans message="Provider setup" />
  ) : (
    <Trans message="Approved" />
  );

  return (
    <Badge
      variant={
        account.is_suspended || account.status === 'rejected'
          ? 'destructive'
          : approved && registered
            ? 'positive'
            : 'secondary'
      }
    >
      {label}
    </Badge>
  );
}

function AccountAvailability({account}: {account: Account}) {
  const approved = account.status === 'approved';
  const registered = account.provider_registration_status === 'registered';
  const available =
    account.checkout_eligible &&
    approved &&
    registered &&
    account.is_active &&
    !account.is_suspended;

  const explanation = account.is_suspended ? (
    <Trans message="Contact support about this suspended account." />
  ) : account.status === 'rejected' ? (
    <Trans message="Update the details and submit new ownership evidence." />
  ) : !approved ? (
    <Trans message="This account needs approval before buyers can use it." />
  ) : !registered ? (
    <Trans message="Waiting for provider registration before checkout is enabled." />
  ) : !account.is_active ? (
    <Trans message="Activate this account to offer it at checkout." />
  ) : account.checkout_blocker === 'verification_unavailable' ? (
    <Trans message="Payment verification is temporarily unavailable. Contact support for help." />
  ) : account.checkout_blocker === 'verification_quota_exhausted' ? (
    <Trans message="You cannot accept additional verified sales right now. Upgrade to Pro to continue." />
  ) : account.checkout_blocker === 'creator_restricted' ? (
    <Trans message="Your account cannot accept sales right now. Contact support." />
  ) : !available ? (
    <Trans message="This account is currently unavailable at checkout. Contact support for help." />
  ) : (
    <Trans message="Buyers can use this account for direct payment at checkout." />
  );

  return (
    <div className="rounded-card-xs bg-muted/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted-foreground">
          <Trans message="Checkout" />
        </span>
        <Badge variant={available ? 'positive' : 'secondary'}>
          {available ? (
            <Trans message="Available" />
          ) : (
            <Trans message="Unavailable" />
          )}
        </Badge>
      </div>
      <p className="mt-1.5 text-sm leading-5 text-muted-foreground">
        {explanation}
      </p>
    </div>
  );
}

function ReceivingAccountCard({
  account,
  methodName,
  methodAvailable,
  busy,
  onEdit,
  onToggle,
}: {
  account: Account;
  methodName: string;
  methodAvailable: boolean;
  busy: boolean;
  onEdit: (account: Account) => void;
  onToggle: (account: Account) => void;
}) {
  const {trans} = useTrans();
  const canToggle =
    account.status === 'approved' &&
    account.provider_registration_status === 'registered' &&
    !account.is_suspended;

  return (
    <Card.Root size="sm" className="overflow-hidden rounded-card-sm">
      <Card.Content className="flex flex-col gap-3 p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <BankLogo
            code={account.provider}
            name={methodName}
            decorative
            frosted
          />
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="truncate text-sm font-semibold leading-5">
                  {methodName}
                </h2>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">
                  {account.account_name}
                </p>
              </div>
              <AccountLifecycleBadge account={account} />
            </div>
            <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
              <Trans
                message="Account ending :digits"
                values={{digits: account.account_ending}}
              />
            </p>
          </div>
        </div>

        <AccountAvailability account={account} />

        {!methodAvailable && (
          <p className="text-sm text-muted-foreground">
            <Trans message="This payment method is not available for new setup. Contact support for assistance." />
          </p>
        )}

        {!account.is_suspended && (
          <div className="flex items-center gap-2 border-t border-border pt-3">
            <Button
              variant="outline"
              size="sm"
              className="min-h-10 flex-1 sm:flex-none"
              disabled={busy || !methodAvailable}
              onClick={() => onEdit(account)}
            >
              <Trans message="Edit and resubmit" />
            </Button>
            {canToggle && (
              <Dropdown.Root>
                <Dropdown.Trigger
                  render={<Button variant="outline" size="icon-sm" />}
                  aria-label={trans(message('Account actions'))}
                  disabled={busy}
                >
                  <MoreHorizontalIcon />
                </Dropdown.Trigger>
                <Dropdown.Content align="end">
                  <Dropdown.Item
                    disabled={busy || (!methodAvailable && !account.is_active)}
                    onClick={() => onToggle(account)}
                  >
                    <PowerIcon />
                    {account.is_active ? (
                      <Trans message="Deactivate" />
                    ) : (
                      <Trans message="Activate" />
                    )}
                  </Dropdown.Item>
                </Dropdown.Content>
              </Dropdown.Root>
            )}
          </div>
        )}
      </Card.Content>
    </Card.Root>
  );
}

function ReceivingAccountsInfo() {
  const {trans} = useTrans();

  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        render={<Button variant="ghost" size="icon-sm" color="default" />}
        className="shrink-0 text-muted-foreground"
        aria-label={trans(message('About receiving accounts'))}
      >
        <InfoIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="end" className="max-w-xs">
          <Trans message="Manage the accounts customers can pay directly at checkout." />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export function Component() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [formError, setFormError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number>();

  const [provider, setProvider] = useState('');
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [proof, setProof] = useState<File>();

  const selectedMethod =
    providers.find(method => method.code === provider) ??
    (provider ? {code: provider, name: provider.toUpperCase()} : undefined);
  const validNumber = isValidAccountNumber(number, provider);
  const invalidNumber = number.trim().length > 0 && !validNumber;
  const invalidName = name.trim().length > 0 && name.trim().length < 3;
  const invalidProof = !!proof && proof.size > MAX_PROOF_SIZE;
  const canSubmit =
    !!provider && validNumber && name.trim().length >= 3 &&
    !!proof && !invalidProof && !busy;

  const load = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/v1/storefront/payment-methods');
      setAccounts(response.data.data ?? []);
      setProviders(response.data.available_methods ?? []);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setProvider('');
    setNumber('');
    setName('');
    setProof(undefined);
    setEditingId(undefined);
    setFormError(false);
  };

  const openNewAccount = () => {
    resetForm();
    setOpen(true);
  };

  const editAccount = (account: Account) => {
    resetForm();
    setEditingId(account.id);
    setProvider(account.provider);
    setName(account.account_name);
    // Never prefill an account number from a masked account list.
    setNumber('');
    setOpen(true);
  };

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setFormError(false);
    setSaved(false);
    try {
      const form = new FormData();
      form.append('provider', provider);
      form.append('account_number', number.trim());
      form.append('account_name', name.trim());
      form.append('proof', proof!);
      await apiClient.post(
        editingId
          ? '/api/v1/storefront/payment-methods/' + editingId + '/resubmit'
          : '/api/v1/storefront/payment-methods',
        form,
      );
      setOpen(false);
      resetForm();
      setSaved(true);
      await load();
    } catch {
      setFormError(true);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (account: Account) => {
    if (busy) return;
    setBusy(true);
    setActionError(false);
    try {
      await apiClient.post(
        '/api/v1/storefront/payment-methods/' + account.id +
          (account.is_active ? '/deactivate' : '/activate'),
      );
      await load();
    } catch {
      setActionError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountSettingsPageLayout title={<Trans message="Receiving accounts" />}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-end gap-2">
          <ReceivingAccountsInfo />
          <Button
            className="min-w-0 flex-1 sm:flex-none"
            disabled={loading || !providers.length || busy}
            onClick={openNewAccount}
          >
            <PlusIcon />
            <Trans message="Add receiving account" />
          </Button>
        </div>

        {loading && <Spinner />}
        {loadError && (
          <p role="alert" className="text-sm text-destructive">
            <Trans message="Unable to load receiving accounts. Try again." />
          </p>
        )}
        {actionError && (
          <p role="alert" className="text-sm text-destructive">
            <Trans message="Unable to update the account. Try again." />
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm text-positive">
            <Trans message="Account submitted for review." />
          </p>
        )}

        {!loading && !loadError && accounts.length === 0 && (
          <Empty.Root>
            <Empty.Header>
              <Empty.Media variant="icon"><LandmarkIcon /></Empty.Media>
              <Empty.Title>
                <Trans message="No receiving accounts yet" />
              </Empty.Title>
              <Empty.Description>
                <Trans message="Add a bank or wallet account in this workspace to receive customer payments." />
              </Empty.Description>
            </Empty.Header>
          </Empty.Root>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {accounts.map(account => {
            const method = providers.find(item => item.code === account.provider);
            return (
              <ReceivingAccountCard
                key={account.id}
                account={account}
                methodName={method?.name ?? account.provider.toUpperCase()}
                methodAvailable={!!method}
                busy={busy}
                onEdit={editAccount}
                onToggle={account => void toggle(account)}
              />
            );
          })}
        </div>

        {!loading && providers.length === 0 && (
          <p className="text-sm text-muted-foreground">
            <Trans message="No payment methods are currently available for setup." />
          </p>
        )}
      </div>

      <Dialog.Root
        open={open}
        onOpenChange={next => {
          setOpen(next);
          if (!next) resetForm();
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Content className="max-h-[calc(100dvh-3rem)] gap-4 rounded-card-sm sm:max-w-lg">
            <Dialog.Header>
              <Dialog.Title>
                {editingId ? (
                  <Trans message="Edit and resubmit account" />
                ) : (
                  <Trans message="Add receiving account" />
                )}
              </Dialog.Title>
              <Dialog.Description>
                <Trans message="An account must be approved before buyers can use it." />
              </Dialog.Description>
            </Dialog.Header>

            <Dialog.Body>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="receiving-provider" className="text-sm font-medium">
                    <Trans message="Payment method" />
                  </label>
                  <Select.Root
                    value={provider}
                    disabled={!!editingId || busy}
                    onValueChange={value => {
                      setProvider(value ?? '');
                      setNumber('');
                      setFormError(false);
                    }}
                  >
                    <Select.Trigger
                      id="receiving-provider"
                      className="h-11 w-full min-w-0"
                    >
                      <Select.Value placeholder={<Trans message="Select payment method" />} className={selectedMethod ? "sr-only" : undefined} />
                      {selectedMethod && (
                        <span aria-hidden="true" className="flex min-w-0 flex-1 items-center gap-2 text-start">
                          <BankLogo code={selectedMethod.code} name={selectedMethod.name} compact decorative />
                          <span className="truncate font-medium">{selectedMethod.name}</span>
                        </span>
                      )}
                    </Select.Trigger>
                    <Select.Content
                      align="start"
                      className="max-h-[min(17rem,42dvh)] min-w-[var(--anchor-width)] rounded-card-sm"
                    >
                      <Select.Group>
                        {providers.map(method => (
                          <Select.Item
                            key={method.code}
                            value={method.code}
                            className="min-h-12"
                          >
                            <span className="flex min-w-0 items-center gap-2.5 py-1">
                              <BankLogo
                                code={method.code}
                                name={method.name}
                                compact
                                decorative
                              />
                              <span className="min-w-0 whitespace-normal font-medium">
                                {method.name}
                              </span>
                            </span>
                          </Select.Item>
                        ))}
                      </Select.Group>
                    </Select.Content>
                  </Select.Root>
                  {editingId && (
                    <p className="text-xs text-muted-foreground">
                      <Trans message="To update this account, re-enter the number and attach new proof." />
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="receiving-number" className="text-sm font-medium">
                    {provider === 'telebirr' || provider === 'cbebirr' ? (
                      <Trans message="Wallet phone number" />
                    ) : (
                      <Trans message="Account number" />
                    )}
                  </label>
                  <Input
                    bindToHookForm={false}
                    id="receiving-number"
                    aria-label="Account or wallet number"
                    className="h-11"
                    inputMode="tel"
                    autoComplete="off"
                    value={number}
                    disabled={busy}
                    aria-invalid={invalidNumber}
                    aria-describedby={invalidNumber ? 'receiving-number-error' : undefined}
                    onChange={event => setNumber(event.target.value)}
                  />
                  {invalidNumber && (
                    <p id="receiving-number-error" role="alert" className="text-sm text-destructive">
                      <Trans message="Enter a valid number for this payment method." />
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="receiving-name" className="text-sm font-medium">
                    <Trans message="Account holder name" />
                  </label>
                  <Input
                    bindToHookForm={false}
                    id="receiving-name"
                    className="h-11"
                    value={name}
                    disabled={busy}
                    autoComplete="name"
                    aria-invalid={invalidName}
                    aria-describedby={invalidName ? 'receiving-name-error' : undefined}
                    onChange={event => setName(event.target.value)}
                  />
                  {invalidName && (
                    <p id="receiving-name-error" role="alert" className="text-sm text-destructive">
                      <Trans message="Account holder name must be at least 3 characters." />
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="receiving-proof" className="text-sm font-medium">
                    <Trans message="Supporting document" />
                  </label>
                  <Input
                    bindToHookForm={false}
                    id="receiving-proof"
                    aria-label="Ownership evidence"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    className="peer sr-only"
                    disabled={busy}
                    aria-invalid={invalidProof}
                    aria-describedby="receiving-proof-help"
                    onChange={event => setProof(event.target.files?.[0])}
                  />
                  <label
                    htmlFor="receiving-proof"
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-input border border-input px-3 py-2 text-sm font-medium hover:border-foreground/20 peer-focus-visible:ring-2 peer-focus-visible:ring-primary peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
                  >
                    <UploadIcon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 truncate">
                      {proof ? proof.name : <Trans message="Choose document" />}
                    </span>
                  </label>
                  <p id="receiving-proof-help" className="text-xs text-muted-foreground">
                    <Trans message="PDF or image, up to 5 MB." />
                  </p>
                  {invalidProof && (
                    <p role="alert" className="text-sm text-destructive">
                      <Trans message="Supporting document must be 5 MB or less." />
                    </p>
                  )}
                </div>

                {formError && (
                  <p role="alert" className="text-sm text-destructive">
                    <Trans message="Unable to submit this account. Check your details and try again." />
                  </p>
                )}
              </div>
            </Dialog.Body>

            <Dialog.Footer>
              <Dialog.CloseButton disabled={busy}>
                <Trans message="Cancel" />
              </Dialog.CloseButton>
              <Button disabled={!canSubmit} onClick={() => void submit()}>
                {busy ? (
                  <Trans message="Submitting…" />
                ) : (
                  <Trans message="Submit account for review" />
                )}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </AccountSettingsPageLayout>
  );
}

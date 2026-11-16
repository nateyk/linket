import {AccountSettingsPageLayout} from '@app/account-settings/account-settings-page-layout';
import {apiClient} from '@common/http/query-client';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Dropdown} from '@shadcn/dropdown/dropdown';
import {Empty} from '@shadcn/empty/empty';
import {Checkbox} from '@shadcn/forms/checkbox/checkbox';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Popover} from '@shadcn/popover/popover';
import {Spinner} from '@shadcn/spinner/spinner';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
import {
  CheckIcon,
  InfoIcon,
  LandmarkIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  StarIcon,
  Trash2Icon,
} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import awash from './bank-logos/awash.svg';
import boa from './bank-logos/boa.svg';
import cbe from './bank-logos/cbe.svg';
import cbebirr from './bank-logos/cbebirr.svg';
import dashen from './bank-logos/dashen.svg';
import telebirr from './bank-logos/telebirr.svg';

export type PayoutAccount = {
  id: number;
  type: string;
  withdrawal_method_id?: number | null;
  bank_code?: string | null;
  bank_name?: string | null;
  account_holder: string;
  account_number_last_four?: string | null;
  masked_account_number?: string;
  display_label?: string;
  is_active: boolean;
  is_default: boolean;
  status: string;
  created_at?: string;
};

export type BankOption = {
  code: string;
  name: string;
  type: string;
};

export const ETHIOPIAN_BANKS: BankOption[] = [
  {code: 'telebirr', name: 'Telebirr (Ethio Telecom)', type: 'telebirr'},
  {code: 'mpesa', name: 'M-Pesa', type: 'mpesa'},
  {code: 'yaya', name: 'Yaya Wallet', type: 'yaya'},
  {code: 'cbe', name: 'Commercial Bank of Ethiopia (CBE)', type: 'bank_transfer'},
  {code: 'boa', name: 'Bank of Abyssinia (BOA)', type: 'bank_transfer'},
  {code: 'dashen', name: 'Dashen Bank', type: 'bank_transfer'},
  {code: 'awash', name: 'Awash Bank', type: 'bank_transfer'},
  {code: 'cbebirr', name: 'CBE Birr', type: 'cbebirr'},
  {code: 'coop', name: 'Cooperative Bank of Oromia', type: 'bank_transfer'},
  {code: 'hibret', name: 'Hibret Bank', type: 'bank_transfer'},
  {code: 'wegagen', name: 'Wegagen Bank', type: 'bank_transfer'},
  {code: 'zemen', name: 'Zemen Bank', type: 'bank_transfer'},
];

const logos: Record<string, string> = {awash, boa, cbe, cbebirr, dashen, telebirr};

function BankLogo({
  code,
  name,
  compact = false,
  decorative = false,
}: {
  code?: string | null;
  name?: string;
  compact?: boolean;
  decorative?: boolean;
}) {
  const normalized = (code ?? '').toLowerCase();
  const logo = logos[normalized];

  return (
    <span
      className={
        compact
          ? 'flex size-8 shrink-0 items-center justify-center rounded-input border border-border bg-background p-1'
          : 'flex size-11 shrink-0 items-center justify-center rounded-card-sm border border-border bg-background p-1.5'
      }
    >
      {logo ? (
        <img
          src={logo}
          alt={decorative ? '' : name ?? 'Bank'}
          className="size-full object-contain"
        />
      ) : (
        <LandmarkIcon
          className="size-5 text-muted-foreground"
          role={decorative ? undefined : 'img'}
          aria-label={decorative ? undefined : name ?? 'Bank'}
          aria-hidden={decorative ? true : undefined}
        />
      )}
    </span>
  );
}

function isValidAccountNumber(number: string, bankCode: string): boolean {
  const trimmed = number.trim();
  const normalized = trimmed.replace(/[\s-]+/g, '');
  if (!/^[0-9+ -]{8,100}$/.test(trimmed)) return false;
  if (['telebirr', 'cbebirr', 'mpesa'].includes(bankCode)) {
    return /^(?:0\d{9}|\+251\d{9})$/.test(normalized);
  }
  if (bankCode === 'yaya') return /^\d{12}$/.test(normalized);
  if (bankCode === 'cbe') return /^\d{13}$/.test(normalized);
  if (bankCode === 'boa') return /^(?:\d{8}|\d{10}|\d{16})$/.test(normalized);
  return true;
}

function PayoutAccountsInfo() {
  const {trans} = useTrans();

  return (
    <Popover.Root>
      <Popover.Trigger
        openOnHover
        render={<Button variant="ghost" size="icon-sm" color="default" />}
        className="shrink-0 text-muted-foreground"
        aria-label={trans(message('About payout accounts'))}
      >
        <InfoIcon />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" className="max-w-xs">
          <Trans message="Bank and mobile money accounts used to receive your Linket withdrawal payouts." />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function PayoutAccountCard({
  account,
  busy,
  onEdit,
  onSetDefault,
  onDelete,
}: {
  account: PayoutAccount;
  busy: boolean;
  onEdit: (account: PayoutAccount) => void;
  onSetDefault: (account: PayoutAccount) => void;
  onDelete: (account: PayoutAccount) => void;
}) {
  const {trans} = useTrans();
  const bankOption = ETHIOPIAN_BANKS.find(
    b => b.code.toLowerCase() === (account.bank_code ?? account.type).toLowerCase()
  );
  const displayName = account.bank_name || bankOption?.name || account.display_label || 'Bank Account';
  const maskedNumber = account.masked_account_number || (account.account_number_last_four ? `•••• ${account.account_number_last_four}` : '••••');

  return (
    <Card.Root size="sm" className="min-w-0 transition-shadow hover:shadow-sm">
      <Card.Content className="flex flex-col gap-3">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <BankLogo code={account.bank_code ?? account.type} name={displayName} decorative />
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="min-w-0 truncate text-sm font-semibold text-foreground">
                  {displayName}
                </h2>
                {account.status !== 'active' && (
                  <Badge variant="outline" className="text-xs">
                    {account.status === 'pending_verification' ? 'Awaiting approval' : 'Needs review'}
                  </Badge>
                )}
                {account.is_default && (
                  <Badge variant="positive" className="gap-1 text-xs font-medium">
                    <CheckIcon className="size-3" />
                    <Trans message="Default" />
                  </Badge>
                )}
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {account.account_holder}
              </p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">
                {maskedNumber}
              </p>
            </div>
          </div>

          <Dropdown.Root>
            <Dropdown.Trigger
              render={<Button variant="ghost" size="icon-sm" />}
              className="shrink-0"
              aria-label={trans(message('Account actions'))}
              disabled={busy}
            >
              <MoreHorizontalIcon className="size-4" />
            </Dropdown.Trigger>
            <Dropdown.Content align="end">
              {!account.is_default && (
                <Dropdown.Item disabled={busy} onClick={() => onSetDefault(account)}>
                  <StarIcon className="size-4" />
                  <Trans message="Set as default" />
                </Dropdown.Item>
              )}
              <Dropdown.Item disabled={busy} onClick={() => onEdit(account)}>
                <PencilIcon className="size-4" />
                <Trans message="Edit account" />
              </Dropdown.Item>
              <Dropdown.Item disabled={busy} onClick={() => onDelete(account)} className="text-destructive">
                <Trash2Icon className="size-4" />
                <Trans message="Remove account" />
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Root>
        </div>
      </Card.Content>
    </Card.Root>
  );
}

export function Component() {
  const [accounts, setAccounts] = useState<PayoutAccount[]>([]);
  const [enabledCodes, setEnabledCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [formError, setFormError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<PayoutAccount | null>(null);

  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolder, setAccountHolder] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const selectedBank = ETHIOPIAN_BANKS.find(b => b.code === bankCode);
  const walletCodes = ['telebirr', 'mpesa', 'yaya', 'cbebirr'];
  const availableBanks = ETHIOPIAN_BANKS.filter(b =>
    enabledCodes.includes(walletCodes.includes(b.code) ? b.code : 'bank_transfer')
  );
  const validNumber = isValidAccountNumber(accountNumber, bankCode);
  const invalidNumber = accountNumber.trim().length > 0 && !validNumber;
  const invalidName = accountHolder.trim().length > 0 && accountHolder.trim().length < 3;
  const canSubmit = !!bankCode && validNumber && accountHolder.trim().length >= 3 && !busy;

  const load = useCallback(async () => {
    try {
      const methodsResponse = await apiClient.get('/api/items/withdrawal-methods');
      setEnabledCodes((methodsResponse.data.data ?? []).map((item: {code: string}) => item.code));
      const response = await apiClient.get('/api/items/payout-methods');
      setAccounts(response.data.data ?? []);
      setLoadError(false);
    } catch {
      setEnabledCodes([]);
      try {
        const fallback = await apiClient.get('/api/v1/storefront/payment-methods');
        const list = (fallback.data.data ?? []).map((item: Record<string, unknown>) => ({
          id: item.id as number,
          type: (item.provider as string) ?? 'bank_transfer',
          bank_code: (item.provider as string) ?? null,
          account_holder: (item.account_name as string) ?? '',
          account_number_last_four: (item.account_ending as string) ?? '',
          masked_account_number: item.account_ending ? `•••• ${item.account_ending}` : '••••',
          is_active: (item.is_active as boolean) ?? true,
          is_default: (item.is_default as boolean) ?? true,
          status: (item.status as string) ?? 'active',
        }));
        setAccounts(list);
        setLoadError(false);
      } catch {
        setLoadError(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setBankCode('');
    setAccountNumber('');
    setAccountHolder('');
    setIsDefault(false);
    setEditingAccount(null);
    setFormError(false);
  };

  const openNewAccount = () => {
    resetForm();
    setIsDefault(accounts.length === 0);
    setOpen(true);
  };

  const openEditAccount = (account: PayoutAccount) => {
    resetForm();
    setEditingAccount(account);
    setBankCode(account.bank_code ?? account.type ?? '');
    setAccountHolder(account.account_holder);
    setAccountNumber('');
    setIsDefault(account.is_default);
    setOpen(true);
  };

  const submit = async () => {
    if (!canSubmit || !selectedBank || !availableBanks.some(b => b.code === bankCode)) return;
    setBusy(true);
    setFormError(false);
    setSaved(false);

    try {
      const payload = {
        type: selectedBank?.type ?? 'bank_transfer',
        bank_code: bankCode,
        bank_name: selectedBank?.name,
        account_holder: accountHolder.trim(),
        destination: accountNumber.trim(),
        is_default: isDefault,
      };

      if (editingAccount) {
        await apiClient.put(`/api/items/payout-methods/${editingAccount.id}`, payload);
      } else {
        await apiClient.post('/api/items/payout-methods', payload);
      }

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

  const setDefault = async (account: PayoutAccount) => {
    if (busy || account.is_default) return;
    setBusy(true);
    setActionError(false);
    try {
      await apiClient.post(`/api/items/payout-methods/${account.id}/default`);
      await load();
    } catch {
      setActionError(true);
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async (account: PayoutAccount) => {
    if (busy) return;
    setBusy(true);
    setActionError(false);
    try {
      await apiClient.delete(`/api/items/payout-methods/${account.id}`);
      await load();
    } catch {
      setActionError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountSettingsPageLayout
      title={
        <span className="flex items-center gap-1.5 font-semibold">
          <Trans message="Payout accounts" />
          <PayoutAccountsInfo />
        </span>
      }
      headerRightContent={
        <Button
          disabled={loading || busy}
          onClick={openNewAccount}
          className="gap-1.5"
        >
          <PlusIcon className="size-4" />
          <Trans message="Add payout account" />
        </Button>
      }
    >
      <div className="flex flex-col gap-5">
        {loading && <Spinner />}
        {loadError && (
          <p role="alert" className="text-sm text-destructive">
            <Trans message="Unable to load payout accounts. Try again." />
          </p>
        )}
        {actionError && (
          <p role="alert" className="text-sm text-destructive">
            <Trans message="Unable to update the account. Try again." />
          </p>
        )}
        {saved && (
          <p role="status" className="text-sm font-medium text-positive">
            <Trans message="Payout account saved successfully." />
          </p>
        )}

        {!loading && !loadError && accounts.length === 0 && (
          <Empty.Root>
            <Empty.Header>
              <Empty.Media variant="icon"><LandmarkIcon className="size-8 text-muted-foreground" /></Empty.Media>
              <Empty.Title>
                <Trans message="No payout accounts yet" />
              </Empty.Title>
              <Empty.Description>
                <Trans message="Add a bank or mobile money account to receive your Linket earnings." />
              </Empty.Description>
            </Empty.Header>
          </Empty.Root>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {accounts.map(account => (
            <PayoutAccountCard
              key={account.id}
              account={account}
              busy={busy}
              onEdit={openEditAccount}
              onSetDefault={setDefault}
              onDelete={deleteAccount}
            />
          ))}
        </div>
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
                {editingAccount ? (
                  <Trans message="Edit payout account" />
                ) : (
                  <Trans message="Add payout account" />
                )}
              </Dialog.Title>
              <Dialog.Description>
                <Trans message="Your Linket earnings will be disbursed to this verified destination." />
              </Dialog.Description>
            </Dialog.Header>

            <Dialog.Body>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="payout-bank" className="text-sm font-medium">
                    <Trans message="Bank or Wallet" />
                  </label>
                  <Select.Root
                    value={bankCode}
                    disabled={busy}
                    onValueChange={value => {
                      setBankCode(value ?? '');
                      setAccountNumber('');
                      setFormError(false);
                    }}
                  >
                    <Select.Trigger id="payout-bank" className="h-11 w-full min-w-0">
                      <Select.Value
                        placeholder={<Trans message="Select bank or wallet" />}
                        className={selectedBank ? 'sr-only' : undefined}
                      />
                      {selectedBank && (
                        <span aria-hidden="true" className="flex min-w-0 flex-1 items-center gap-2 text-start">
                          <BankLogo code={selectedBank.code} name={selectedBank.name} compact decorative />
                          <span className="truncate font-medium">{selectedBank.name}</span>
                        </span>
                      )}
                    </Select.Trigger>
                    <Select.Content
                      align="start"
                      className="max-h-[min(17rem,42dvh)] min-w-[var(--anchor-width)] rounded-card-sm"
                    >
                      <Select.Group>
                        {availableBanks.map(bank => (
                          <Select.Item key={bank.code} value={bank.code} className="min-h-12">
                            <span className="flex min-w-0 items-center gap-2.5 py-1">
                              <BankLogo code={bank.code} name={bank.name} compact decorative />
                              <span className="min-w-0 whitespace-normal font-medium">{bank.name}</span>
                            </span>
                          </Select.Item>
                        ))}
                      </Select.Group>
                    </Select.Content>
                  </Select.Root>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="payout-account-number" className="text-sm font-medium">
                    {['telebirr', 'cbebirr', 'mpesa', 'yaya'].includes(bankCode) ? (
                      <Trans message="Phone number (e.g. 0911223344)" />
                    ) : (
                      <Trans message="Account number" />
                    )}
                  </label>
                  <Input
                    bindToHookForm={false}
                    id="payout-account-number"
                    aria-label="Account or wallet number"
                    className="h-11 font-mono"
                    inputMode={['telebirr', 'cbebirr', 'mpesa', 'yaya'].includes(bankCode) ? 'tel' : 'numeric'}
                    autoComplete="off"
                    value={accountNumber}
                    disabled={busy}
                    aria-invalid={invalidNumber}
                    aria-describedby={invalidNumber ? 'payout-number-error' : undefined}
                    onChange={event => setAccountNumber(event.target.value)}
                  />
                  {invalidNumber && (
                    <p id="payout-number-error" role="alert" className="text-sm text-destructive">
                      <Trans message="Enter a valid account or phone number for this provider." />
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="payout-account-name" className="text-sm font-medium">
                    <Trans message="Account holder name" />
                  </label>
                  <Input
                    bindToHookForm={false}
                    id="payout-account-name"
                    aria-label="Account holder name"
                    className="h-11"
                    value={accountHolder}
                    disabled={busy}
                    autoComplete="name"
                    aria-invalid={invalidName}
                    aria-describedby={invalidName ? 'payout-name-error' : undefined}
                    onChange={event => setAccountHolder(event.target.value)}
                  />
                  {invalidName && (
                    <p id="payout-name-error" role="alert" className="text-sm text-destructive">
                      <Trans message="Account holder name must be at least 3 characters." />
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Checkbox
                    id="payout-is-default"
                    checked={isDefault}
                    disabled={busy}
                    bindToHookForm={false}
                    onCheckedChange={checked => setIsDefault(Boolean(checked))}
                  />
                  <label htmlFor="payout-is-default" className="cursor-pointer text-sm font-medium">
                    <Trans message="Set as default payout destination" />
                  </label>
                </div>

                {formError && (
                  <p role="alert" className="text-sm text-destructive">
                    <Trans message="Unable to save this payout account. Please check your details and try again." />
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
                  <Trans message="Saving…" />
                ) : (
                  <Trans message="Save payout account" />
                )}
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </AccountSettingsPageLayout>
  );
}

import {AccountSettingsPageLayout} from '@app/account-settings/account-settings-page-layout';
import {apiClient} from '@common/http/query-client';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Dialog} from '@shadcn/dialog/dialog';
import {Empty} from '@shadcn/empty/empty';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Spinner} from '@shadcn/spinner/spinner';
import {Trans} from '@ui/i18n/trans';
import {LandmarkIcon, PlusIcon} from 'lucide-react';
import {useCallback, useEffect, useState} from 'react';
import awash from './bank-logos/awash.svg';
import boa from './bank-logos/boa.svg';
import cbe from './bank-logos/cbe.svg';
import cbebirr from './bank-logos/cbebirr.svg';
import dashen from './bank-logos/dashen.svg';
import telebirr from './bank-logos/telebirr.svg';

type Account = {id: number; provider: string; account_ending: string; account_name: string; status: string; is_active: boolean; is_suspended: boolean; provider_registration_status: string; checkout_eligible: boolean};
type Provider = {code: string; name: string};
const logos: Record<string, string> = {awash, boa, cbe, cbebirr, dashen, telebirr};

function BankLogo({code, name}: {code: string; name: string}) {
  return <div className="flex size-12 shrink-0 items-center justify-center rounded-card-sm border border-border bg-background p-1">{logos[code] ? <img src={logos[code]} alt={name} className="size-full object-contain" /> : <LandmarkIcon aria-label={name} role="img" />}</div>;
}

export function Component() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [provider, setProvider] = useState('');
  const [number, setNumber] = useState('');
  const [name, setName] = useState('');
  const [proof, setProof] = useState<File>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number>();
  const cleanNumber = number.trim().replace(/[\s-]+/g, '');
  const validNumber = /^[0-9+ -]{8,100}$/.test(number.trim()) && (provider === 'telebirr' ? /^(?:0\d{9}|\+251\d{9})$/.test(cleanNumber) : provider === 'awash' ? /^\d{14}$/.test(cleanNumber) : provider === 'boa' ? /^(?:\d{8}|\d{16})$/.test(cleanNumber) : true);
  const load = useCallback(async () => {
    try {
      const response = await apiClient.get('/api/v1/storefront/payment-methods');
      setAccounts(response.data.data ?? []);
      setProviders(response.data.available_methods ?? []);
      setError(false);
    } catch { setError(true); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const reset = () => { setProvider(''); setNumber(''); setName(''); setProof(undefined); setEditingId(undefined); };
  const submit = async () => {
    if (!provider || !number.trim() || !name.trim() || !proof) return;
    setBusy(true); setSaved(false);
    try {
      const form = new FormData();
      form.append('provider', provider); form.append('account_number', number.trim()); form.append('account_name', name.trim()); form.append('proof', proof);
      await apiClient.post(editingId ? `/api/v1/storefront/payment-methods/${editingId}/resubmit` : '/api/v1/storefront/payment-methods', form);
      setOpen(false); reset(); setSaved(true); await load();
    } catch { setError(true); } finally { setBusy(false); }
  };
  const toggle = async (account: Account) => {
    setBusy(true);
    try { await apiClient.post(`/api/v1/storefront/payment-methods/${account.id}/${account.is_active ? 'deactivate' : 'activate'}`); await load(); }
    catch { setError(true); } finally { setBusy(false); }
  };
  return <AccountSettingsPageLayout title={<Trans message="Receiving Accounts" />}>
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-muted-foreground"><Trans message="Manage the accounts where customers pay you directly." /></p><Button onClick={() => { reset(); setOpen(true); }} disabled={loading || !providers.length}><PlusIcon /><Trans message="Add receiving account" /></Button></div>
      {loading && <Spinner />}
      {error && <p role="alert" className="text-sm text-destructive"><Trans message="Unable to save or load receiving accounts. Check your details and try again." /></p>}
      {saved && <p role="status" className="text-sm text-positive"><Trans message="Account submitted for review." /></p>}
      {!loading && !accounts.length && <Empty.Root><Empty.Header><Empty.Media variant="icon"><LandmarkIcon /></Empty.Media><Empty.Title><Trans message="No receiving accounts yet" /></Empty.Title><Empty.Description><Trans message="Add an account to receive payments directly from your customers." /></Empty.Description></Empty.Header></Empty.Root>}
      <div className="grid gap-4 md:grid-cols-2">{accounts.map(account => {
        const method = providers.find(item => item.code === account.provider);
        const methodName = method?.name ?? account.provider.toUpperCase();
        const eligible = account.status === 'approved' && account.provider_registration_status === 'registered' && !account.is_suspended;
        const checkoutStatus = account.is_suspended ? <Trans message="Suspended" /> : account.checkout_eligible ? <Trans message="Available at checkout" /> : account.status === 'pending' || (account.status === 'approved' && account.provider_registration_status !== 'registered') ? <Trans message="Pending approval" /> : <Trans message="Disabled" />;
        return <Card.Root key={account.id} size="sm"><Card.Content className="flex flex-col gap-4"><div className="flex items-start gap-3"><BankLogo code={account.provider} name={methodName} /><div className="min-w-0 flex-1"><h2 className="font-semibold">{methodName}</h2><p className="truncate text-sm text-muted-foreground">{account.account_name}</p><p className="font-mono text-sm text-muted-foreground">•••• {account.account_ending}</p></div><Badge variant={eligible ? 'positive' : account.is_suspended || account.status === 'rejected' ? 'destructive' : 'secondary'}>{account.is_suspended ? <Trans message="Suspended" /> : account.status === 'rejected' ? <Trans message="Rejected" /> : account.status !== 'approved' ? <Trans message="Pending review" /> : account.provider_registration_status !== 'registered' ? <Trans message="Pending provider registration" /> : <Trans message="Approved" />}</Badge></div><p className="text-sm font-medium">{checkoutStatus}</p><p className="text-sm text-muted-foreground">{!method ? <Trans message="This payment method is unavailable for setup. Contact support for its checkout availability." /> : eligible ? account.is_active ? <Trans message="Active — approved and registered." /> : <Trans message="Inactive — activate to use at eligible checkouts." /> : <Trans message="Not available at checkout until approval and provider registration are complete." />}</p><div className="flex flex-wrap gap-2">{!account.is_suspended && <Button size="sm" disabled={busy || !method} variant="outline" onClick={() => { setEditingId(account.id); setProvider(account.provider); setName(account.account_name); setNumber(''); setProof(undefined); setOpen(true); }}><Trans message="Edit and resubmit" /></Button>}{eligible && <Button size="sm" disabled={busy || (!method && !account.is_active)} variant="outline" onClick={() => void toggle(account)}>{account.is_active ? <Trans message="Deactivate" /> : <Trans message="Activate" />}</Button>}</div></Card.Content></Card.Root>;
      })}</div>
      {!loading && !providers.length && <p className="text-sm text-muted-foreground"><Trans message="No payment methods are currently available for setup." /></p>}
    </div>
    <Dialog.Root open={open} onOpenChange={setOpen}><Dialog.Portal><Dialog.Backdrop /><Dialog.Content><Dialog.Header><Dialog.Title>{editingId ? <Trans message="Edit and resubmit account" /> : <Trans message="Add receiving account" />}</Dialog.Title><Dialog.Description><Trans message="New and resubmitted accounts require approval before customers can use them." /></Dialog.Description></Dialog.Header><Dialog.Body><div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium"><Trans message="Payment method" /><Select.Root value={provider} disabled={!!editingId} onValueChange={value => setProvider(value ?? '')}><Select.Trigger className="w-full"><Select.Value placeholder={<Trans message="Select payment method" />} /></Select.Trigger><Select.Content><Select.Group>{providers.map(method => <Select.Item key={method.code} value={method.code}><span className="flex items-center gap-2"><BankLogo code={method.code} name={method.name} />{method.name}</span></Select.Item>)}</Select.Group></Select.Content></Select.Root></label>
      <label className="flex flex-col gap-1 text-sm font-medium">{provider === 'telebirr' || provider === 'cbebirr' ? <Trans message="Wallet phone number" /> : <Trans message="Account number" />}<Input bindToHookForm={false} aria-label="Account or wallet number" inputMode="tel" autoComplete="off" value={number} onChange={event => setNumber(event.target.value)} /></label>
      {number && !validNumber && <p className="text-sm text-destructive"><Trans message="Enter a valid account or wallet number for this provider." /></p>}
      <label className="flex flex-col gap-1 text-sm font-medium"><Trans message="Account holder name" /><Input bindToHookForm={false} aria-label="Account holder name" value={name} onChange={event => setName(event.target.value)} /></label>
      <label className="flex flex-col gap-1 text-sm font-medium"><Trans message="Supporting document" /><Input bindToHookForm={false} type="file" aria-label="Ownership evidence" accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={event => setProof(event.target.files?.[0])} /><span className="text-xs font-normal text-muted-foreground"><Trans message="PDF or image, up to 5 MB." /></span></label>
      {error && <p role="alert" className="text-sm text-destructive"><Trans message="Unable to submit this account. Check your details and try again." /></p>}
      {name && name.trim().length < 3 && <p className="text-sm text-destructive"><Trans message="Account holder name must be at least 3 characters." /></p>}
      {proof && proof.size > 5 * 1024 * 1024 && <p className="text-sm text-destructive"><Trans message="Supporting document must be 5 MB or less." /></p>}
    </div></Dialog.Body><Dialog.Footer><Dialog.CloseButton><Trans message="Cancel" /></Dialog.CloseButton><Button disabled={busy || !provider || !validNumber || name.trim().length < 3 || !proof || proof.size > 5 * 1024 * 1024} onClick={() => void submit()}><Trans message="Submit account for review" /></Button></Dialog.Footer></Dialog.Content></Dialog.Portal></Dialog.Root>
  </AccountSettingsPageLayout>;
}

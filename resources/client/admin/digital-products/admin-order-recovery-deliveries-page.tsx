import {DashboardLayout} from '@common/ui/dashboard/dashboard-layout';
import {apiClient} from '@common/http/query-client';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Input} from '@shadcn/forms/input/input';
import {Select} from '@shadcn/forms/select/select';
import {Spinner} from '@shadcn/spinner/spinner';
import {Table} from '@shadcn/table/table';
import {Trans} from '@ui/i18n/trans';
import {ArrowLeftIcon, RefreshCwIcon, SearchIcon, ShieldCheckIcon} from 'lucide-react';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {Link} from 'react-router';

type Delivery = {
  id: number;
  masked_email: string;
  event: 'recovery_requested' | 'recovery_email' | 'receipt_resend_requested' | 'receipt_email';
  status: 'accepted' | 'queued' | 'sent' | 'failed';
  failure_code?: string | null;
  created_at?: string | null;
  order_reference?: string | null;
  product_title?: string | null;
};

export function Component() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [status, setStatus] = useState('all');
  const [event, setEvent] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const filters = useMemo(() => ({status, event, search: search.trim()}), [event, search, status]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    const params = new URLSearchParams();
    if (filters.status !== 'all') params.set('status', filters.status);
    if (filters.event !== 'all') params.set('event', filters.event);
    if (filters.search) params.set('search', filters.search);

    try {
      const response = await apiClient.get(`/api/v1/admin/digital-products/order-recovery-deliveries?${params.toString()}`);
      setDeliveries(response.data.data ?? []);
    } catch {
      setError('Unable to load delivery history.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { void load(); }, [load]);

  return <DashboardLayout.MainSection>
    <DashboardLayout.SectionHeader><DashboardLayout.SidebarToggle /><div><DashboardLayout.SectionTitle><Trans message="Purchase delivery history" /></DashboardLayout.SectionTitle><p className="mt-0.5 text-sm text-muted-foreground"><Trans message="Recovery and receipt delivery events for Digital Product buyers." /></p></div><div className="flex gap-2"><Button variant="outline" render={<Link to="/admin/payment-activity" />}><ArrowLeftIcon /><Trans message="Payment activity" /></Button><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCwIcon className={loading ? 'animate-spin' : undefined} /><Trans message="Refresh" /></Button></div></DashboardLayout.SectionHeader>
    <DashboardLayout.SectionContent className="overflow-y-auto"><div className="mx-auto w-full max-w-6xl space-y-5 py-6">
      <Card.Root><Card.Header><Card.Title className="flex items-center gap-2"><ShieldCheckIcon className="size-5 text-primary" /><Trans message="Privacy-safe delivery records" /></Card.Title><Card.Description><Trans message="Buyer emails are masked. This history never includes download links, receipts, or payout data." /></Card.Description></Card.Header><Card.Content className="space-y-4">
        {error && <div className="rounded-input border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
        <div className="flex flex-col gap-2 sm:flex-row"><div className="relative flex-1"><SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="ps-9" value={search} onChange={item => setSearch(item.target.value)} placeholder="Search masked email or order reference" /></div><Select.Root value={event} onValueChange={value => setEvent(String(value))}><Select.Trigger className="w-full sm:w-48"><Select.Value /></Select.Trigger><Select.Content><Select.Item value="all"><Trans message="All events" /></Select.Item><Select.Item value="recovery_requested"><Trans message="Recovery requests" /></Select.Item><Select.Item value="recovery_email"><Trans message="Recovery emails" /></Select.Item><Select.Item value="receipt_resend_requested"><Trans message="Receipt requests" /></Select.Item><Select.Item value="receipt_email"><Trans message="Receipt emails" /></Select.Item></Select.Content></Select.Root><Select.Root value={status} onValueChange={value => setStatus(String(value))}><Select.Trigger className="w-full sm:w-36"><Select.Value /></Select.Trigger><Select.Content><Select.Item value="all"><Trans message="All statuses" /></Select.Item><Select.Item value="accepted"><Trans message="Accepted" /></Select.Item><Select.Item value="queued"><Trans message="Queued" /></Select.Item><Select.Item value="sent"><Trans message="Sent" /></Select.Item><Select.Item value="failed"><Trans message="Failed" /></Select.Item></Select.Content></Select.Root></div>
        <div className="overflow-x-auto rounded-card border"><Table.Root><Table.Header><Table.Row><Table.Head><Trans message="Buyer" /></Table.Head><Table.Head><Trans message="Event" /></Table.Head><Table.Head><Trans message="Purchase" /></Table.Head><Table.Head><Trans message="Status" /></Table.Head><Table.Head><Trans message="Time" /></Table.Head></Table.Row></Table.Header><Table.Body>{loading ? <Table.Row><Table.Cell colSpan={5} className="h-32 text-center"><Spinner /></Table.Cell></Table.Row> : deliveries.length ? deliveries.map(delivery => <Table.Row key={delivery.id}><Table.Cell className="font-medium">{delivery.masked_email}</Table.Cell><Table.Cell><EventLabel event={delivery.event} /></Table.Cell><Table.Cell><p className="max-w-56 truncate text-sm">{delivery.product_title ?? <Trans message="Purchase recovery" />}</p>{delivery.order_reference && <p className="max-w-56 truncate font-mono text-xs text-muted-foreground">{delivery.order_reference}</p>}</Table.Cell><Table.Cell><StatusBadge delivery={delivery} /></Table.Cell><Table.Cell className="whitespace-nowrap text-sm text-muted-foreground">{delivery.created_at ? formatDate(delivery.created_at) : <Trans message="—" />}</Table.Cell></Table.Row>) : <Table.Row><Table.Cell colSpan={5} className="h-32 text-center text-muted-foreground"><Trans message="No delivery records match these filters." /></Table.Cell></Table.Row>}</Table.Body></Table.Root></div>
      </Card.Content></Card.Root>
    </div></DashboardLayout.SectionContent>
  </DashboardLayout.MainSection>;
}

function EventLabel({event}: {event: Delivery['event']}) {
  const labels: Record<Delivery['event'], string> = {recovery_requested: 'Recovery requested', recovery_email: 'Recovery email', receipt_resend_requested: 'Receipt resend requested', receipt_email: 'Receipt email'};
  return <span className="text-sm"><Trans message={labels[event]} /></span>;
}

function StatusBadge({delivery}: {delivery: Delivery}) {
  const color = delivery.status === 'sent' ? 'positive' : delivery.status === 'failed' ? 'danger' : delivery.status === 'queued' ? 'warning' : 'neutral';
  return <div className="space-y-1"><Badge color={color as any}><Trans message={delivery.status[0].toUpperCase() + delivery.status.slice(1)} /></Badge>{delivery.failure_code && <p className="text-xs text-destructive"><Trans message={delivery.failure_code.replaceAll('_', ' ')} /></p>}</div>;
}

function formatDate(value: string) { return new Intl.DateTimeFormat(undefined, {dateStyle: 'medium', timeStyle: 'short'}).format(new Date(value)); }

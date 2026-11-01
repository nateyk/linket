import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Input} from '@shadcn/forms/input/input';
import {Card} from '@shadcn/card/card';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {formatMoney} from '@ui/i18n/format-money';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {Link} from 'react-router';
import {ReactNode, useState} from 'react';

type BillingHistory = {
  pro_plan?: {monthly_price_cents: number | null; currency: string};
  pro_subscription?: {
    status: string;
    renews_at?: string | null;
    ends_at?: string | null;
    can_renew?: boolean;
    pending_payment?: {payment_id?: string; status: string; amount_cents: number} | null;
    payments?: Array<{
      payment_id: string;
      amount_cents: number;
      currency: string;
      status: string;
      transaction_reference?: string | null;
      provider?: string | null;
      paid_at?: string | null;
      created_at?: string | null;
      receipt_number?: string | null;
      receipt_url?: string | null;
    }>;
  };
  invoices?: {data: Array<{uuid: string; invoice_number: string; commission_fee_cents: number; status: string; created_at?: string; paid_at?: string | null}>};
  corporate_account?: {provider: string; account_number: string | null};
  estimated_commission?: {gross_sales_cents: number; fee_cents: number};
};

export function SubscriptionBillingHistory() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [startedAmountCents, setStartedAmountCents] = useState<number>();
  const [startedPaymentId, setStartedPaymentId] = useState<string>();
  const [proReference, setProReference] = useState('');
  const [invoiceReferences, setInvoiceReferences] = useState<Record<string, string>>({});
  const query = useQuery({
    queryKey: ['creator-direct-billing-history'],
    queryFn: async () => (await apiClient.get<BillingHistory>('/api/v1/billing/direct')).data,
  });

  const startRenewal = async () => {
    setBusy(true);
    try {
      const response = await apiClient.post('/api/v1/billing/direct/pro');
      setStartedAmountCents(response.data.amount_cents);
      setStartedPaymentId(response.data.payment_id);
      setActionError(undefined);
      await queryClient.invalidateQueries({queryKey: ['creator-direct-billing-history']});
    } catch (reason) {
      setActionError(getApiErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const submitReference = async (endpoint: string, reference: string) => {
    if (!reference.trim()) return;
    setBusy(true);
    try {
      await apiClient.post(endpoint, {reference: reference.trim()});
      setActionError(undefined);
      setProReference('');
      await queryClient.invalidateQueries({queryKey: ['creator-direct-billing-history']});
    } catch (reason) {
      setActionError(getApiErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const pendingPaymentId = query.data?.pro_subscription?.pending_payment?.payment_id ?? startedPaymentId ?? query.data?.pro_subscription?.payments?.find(payment => payment.status === 'pending_payment')?.payment_id;
  const renewalPriceCents =
    query.data?.pro_subscription?.pending_payment?.amount_cents ??
    query.data?.pro_plan?.monthly_price_cents ??
    startedAmountCents;
  const currency = query.data?.pro_plan?.currency ?? 'ETB';
  const canRenew = query.data?.pro_subscription?.can_renew !== false;

  return (
    <div className="flex flex-col gap-4">
      <Card.Root>
        <Card.Header>
          <Card.Title><Trans message="Pro subscription and renewals" /></Card.Title>
          <Card.Description><Trans message="Verified payments are required to activate or renew Pro." /></Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3 text-sm">
          {query.isPending ? <Skeleton className="h-16 w-full" /> : query.isError ? (
            <p role="alert" className="text-destructive"><Trans message="Billing history could not be loaded. Please try again." /></p>
          ) : <>
            <div className="flex flex-wrap items-center gap-2">
              <span><Trans message="Plan status: :status" values={{status: query.data.pro_subscription?.status ?? 'inactive'}} /></span>
              <Badge>{query.data.pro_subscription?.status ?? 'inactive'}</Badge>
              {query.data.pro_subscription?.renews_at && <span className="text-muted-foreground"><Trans message="Next renewal: :date" values={{date: new Date(query.data.pro_subscription.renews_at).toLocaleDateString()}} /></span>}
              {query.data.pro_subscription?.ends_at && <span className="text-muted-foreground"><Trans message="Access ends: :date" values={{date: new Date(query.data.pro_subscription.ends_at).toLocaleDateString()}} /></span>}
            </div>
            {renewalPriceCents != null && (
              <p>
                <Trans
                  message="Renewal price: :price"
                  values={{price: formatMoney(renewalPriceCents, currency)}}
                />
              </p>
            )}
            {query.data.pro_subscription?.pending_payment && (
              <p role="status" className="text-warning">
                <Trans
                  message="Payment status: :status · :amount due"
                  values={{
                    status: query.data.pro_subscription.pending_payment.status,
                    amount: formatMoney(query.data.pro_subscription.pending_payment.amount_cents, currency),
                  }}
                />
              </p>
            )}
            {actionError && <p role="alert" className="text-destructive">{actionError}</p>}
            {startedAmountCents != null && (
              <p role="status">
                <Trans
                  message="Pro payment created for :amount. Enter your transfer reference below."
                  values={{amount: formatMoney(startedAmountCents, currency)}}
                />
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              {canRenew && (
                <Button disabled={busy} onClick={() => void startRenewal()}>
                  <Trans message="Renew Pro" />
                </Button>
              )}
              <Link className="text-primary underline" to="/account-settings/receiving-accounts">
                <Trans message="Manage receiving accounts" />
              </Link>
            </div>
            {query.data?.corporate_account?.account_number && (
              <p className="text-muted-foreground">
                <Trans message="Send the Pro payment to :provider account :account." values={{provider: query.data.corporate_account.provider.toUpperCase(), account: query.data.corporate_account.account_number}} />
              </p>
            )}
            {pendingPaymentId && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                  <Trans message="Pro payment reference" />
                  <Input bindToHookForm={false} value={proReference} onChange={event => setProReference(event.target.value)} placeholder="Transaction reference" />
                </label>
                <Button disabled={busy || !proReference.trim()} onClick={() => void submitReference(`/api/v1/billing/direct/pro/${pendingPaymentId}/reference`, proReference)}>
                  <Trans message="Verify Pro payment" />
                </Button>
              </div>
            )}
            {query.data.pro_subscription?.payments?.length ? query.data.pro_subscription.payments.map(payment => (
              <div key={payment.payment_id} className="flex flex-wrap items-center justify-between gap-3 rounded-card-sm bg-muted p-3">
                <div className="min-w-0">
                  <p className="font-medium">{formatMoney(payment.amount_cents, payment.currency)}</p>
                  <p className="break-all text-muted-foreground"><Trans message="Transaction reference: :reference" values={{reference: payment.transaction_reference ?? '—'}} /></p>
                  <p className="text-muted-foreground"><FormattedDate date={payment.paid_at ?? payment.created_at} />{payment.provider ? ` · ${payment.provider.toUpperCase()}` : ''}</p>
                </div>
                <Badge>{billingPaymentStatus(payment.status)}</Badge>
                {payment.status === 'paid' && payment.receipt_url && (
                  <a className="text-primary underline" href={payment.receipt_url}>
                    <Trans message="Download payment receipt" />
                  </a>
                )}
              </div>
            )) : <p className="text-muted-foreground"><Trans message="No Pro payments recorded yet." /></p>}
          </>}
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Header>
          <Card.Title><Trans message="Legacy billing" /></Card.Title>
          <Card.Description><Trans message="Historical commission invoices stay payable. New verified sales are not added to this balance." /></Card.Description>
        </Card.Header>
        <Card.Content className="flex flex-col gap-3 text-sm">
          {query.data?.invoices?.data.length ? query.data.invoices.data.map(invoice => (
            <div key={invoice.uuid} className="flex flex-wrap items-center justify-between gap-3 rounded-card-sm bg-muted p-3">
              <div>
                <p className="font-medium">{invoice.invoice_number}</p>
                <p>{formatMoney(invoice.commission_fee_cents, 'ETB')} · {invoice.status}</p>
                <p className="text-muted-foreground"><FormattedDate date={invoice.paid_at ?? invoice.created_at} /></p>
              </div>
              <Badge>{invoice.status}</Badge>
            </div>
          )) : query.isPending ? <Skeleton className="h-16 w-full" /> : <p className="text-muted-foreground"><Trans message="No legacy commission invoices." /></p>}
          {query.data?.estimated_commission && query.data.estimated_commission.fee_cents > 0 && (
            <p><Trans message="Uninvoiced historical commission: :amount" values={{amount: formatMoney(query.data.estimated_commission.fee_cents, 'ETB')}} /></p>
          )}
          {query.data?.invoices?.data?.filter(invoice => ['pending', 'overdue'].includes(invoice.status)).map(invoice => (
            <div key={`${invoice.uuid}-verify`} className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                <Trans message="Payment reference for invoice :number" values={{number: invoice.invoice_number}} />
                <Input bindToHookForm={false} value={invoiceReferences[invoice.uuid] ?? ''} onChange={event => setInvoiceReferences(current => ({...current, [invoice.uuid]: event.target.value}))} placeholder="Transaction reference" />
              </label>
              <Button disabled={busy || !(invoiceReferences[invoice.uuid] ?? '').trim()} onClick={() => void submitReference(`/api/v1/billing/direct/invoices/${invoice.uuid}/reference`, invoiceReferences[invoice.uuid] ?? '')}>
                <Trans message="Verify invoice payment" />
              </Button>
            </div>
          ))}
        </Card.Content>
      </Card.Root>
    </div>
  );
}

function billingPaymentStatus(status: string): ReactNode {
  const labels: Record<string, ReactNode> = {
    paid: <Trans message="Paid" />,
    pending_payment: <Trans message="Pending payment" />,
    pending_verification: <Trans message="Pending verification" />,
    manual_review: <Trans message="Manual review" />,
    rejected: <Trans message="Rejected" />,
    expired: <Trans message="Expired" />,
  };

  return labels[status] ?? <Trans message="Status unavailable" />;
}

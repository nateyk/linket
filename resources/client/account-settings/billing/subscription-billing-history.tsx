import {apiClient} from '@common/http/query-client';
import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
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
    pending_payment?: {status: string; amount_cents: number} | null;
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
};

export function SubscriptionBillingHistory() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [startedAmountCents, setStartedAmountCents] = useState<number>();
  const query = useQuery({
    queryKey: ['creator-direct-billing-history'],
    queryFn: async () => (await apiClient.get<BillingHistory>('/api/v1/billing/direct')).data,
  });

  const startRenewal = async () => {
    setBusy(true);
    try {
      const response = await apiClient.post('/api/v1/billing/direct/pro');
      setStartedAmountCents(response.data.amount_cents);
      setActionError(undefined);
      await queryClient.invalidateQueries({queryKey: ['creator-direct-billing-history']});
    } catch (reason) {
      setActionError(getApiErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

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
                  message="Renewal invoice ready for :amount. Complete payment verification from Orders & Sales billing."
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
              <Link className="text-primary underline" to="/dashboard/orders?tab=billing">
                <Trans message="Open payment verification" />
              </Link>
            </div>
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
          <Link className="text-primary underline" to="/dashboard/orders?tab=billing"><Trans message="Open billing and payment details" /></Link>
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

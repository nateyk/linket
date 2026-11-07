import {getApiErrorMessage} from '@common/http/errors/parsed-api-error';
import {apiClient} from '@common/http/query-client';
import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Card} from '@shadcn/card/card';
import {Input} from '@shadcn/forms/input/input';
import {Skeleton} from '@shadcn/skeleton/skeleton';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {formatMoney} from '@ui/i18n/format-money';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {ReactNode, useState} from 'react';
import {Link} from 'react-router';

type ProPayment = {
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
};

type BillingHistory = {
  subscription_gateway?: 'verify_et' | 'chapa';
  pro_plan?: {monthly_price_cents: number | null; currency: string; product_id?: number; price_id?: number};
  pro_subscription?: {
    status: string;
    renews_at?: string | null;
    ends_at?: string | null;
    can_renew?: boolean;
    pending_payment?: {
      payment_id?: string;
      status: string;
      amount_cents: number;
    } | null;
    payments?: ProPayment[];
  };
  corporate_account?: {provider: string; account_number: string | null};
};

export function SubscriptionBillingHistory() {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [startedAmountCents, setStartedAmountCents] = useState<number>();
  const [startedPaymentId, setStartedPaymentId] = useState<string>();
  const [proReference, setProReference] = useState('');

  const query = useQuery({
    queryKey: ['creator-direct-billing-history'],
    queryFn: async () =>
      (await apiClient.get<BillingHistory>('/api/v1/billing/direct')).data,
  });

  const startRenewal = async () => {
    setBusy(true);
    try {
      if (query.data?.subscription_gateway === 'chapa') {
        const response = await apiClient.post('/api/v1/billing/chapa/checkout', {
          product_id: query.data.pro_plan?.product_id,
          price_id: query.data.pro_plan?.price_id,
        });
        window.location.assign(response.data.checkout_url);
        return;
      }
      const response = await apiClient.post('/api/v1/billing/direct/pro');
      setStartedAmountCents(response.data.amount_cents);
      setStartedPaymentId(response.data.payment_id);
      setActionError(undefined);
      await queryClient.invalidateQueries({
        queryKey: ['creator-direct-billing-history'],
      });
    } catch (reason) {
      setActionError(getApiErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const submitProReference = async () => {
    if (!pendingPaymentId || !proReference.trim()) return;

    setBusy(true);
    try {
      await apiClient.post(
        `/api/v1/billing/direct/pro/${pendingPaymentId}/reference`,
        {reference: proReference.trim()},
      );
      setActionError(undefined);
      setProReference('');
      await queryClient.invalidateQueries({
        queryKey: ['creator-direct-billing-history'],
      });
    } catch (reason) {
      setActionError(getApiErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  const pendingPaymentId =
    query.data?.pro_subscription?.pending_payment?.payment_id ??
    startedPaymentId ??
    query.data?.pro_subscription?.payments?.find(
      payment => payment.status === 'pending_payment',
    )?.payment_id;

  const renewalPriceCents =
    query.data?.pro_subscription?.pending_payment?.amount_cents ??
    query.data?.pro_plan?.monthly_price_cents ??
    startedAmountCents;
  const currency = query.data?.pro_plan?.currency ?? 'ETB';
  const canRenew = query.data?.pro_subscription?.can_renew !== false;
  const subscriptionStatus =
    query.data?.pro_subscription?.status ?? 'inactive';
  const payments = query.data?.pro_subscription?.payments ?? [];
  const isUpgrade =
    subscriptionStatus === 'inactive' ||
    subscriptionStatus === 'expired' ||
    subscriptionStatus === 'cancelled';
  const usesChapa = query.data?.subscription_gateway === 'chapa';

  return (
    <Card.Root size="sm" className="rounded-card-sm">
      <Card.Header className="border-b">
        <Card.Title>
          <Trans message="Pro subscription" />
        </Card.Title>
        <Card.Description>
          {usesChapa ? (
            <Trans message="Upgrade or renew Pro with Chapa." />
          ) : (
            <Trans message="Upgrade or renew Pro with a verified direct payment." />
          )}
        </Card.Description>
        <Card.Action>
          <Link
            to="/pricing"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            <Trans message="View Pro" />
          </Link>
        </Card.Action>
      </Card.Header>

      <Card.Content className="flex flex-col gap-5">
        {query.isPending ? (
          <div className="grid gap-3 sm:grid-cols-3" aria-busy="true">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : query.isError ? (
          <div className="flex flex-col items-start gap-3" role="alert">
            <p className="text-sm text-destructive">
              <Trans message="Billing details could not be loaded." />
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
            >
              <Trans message="Try again" />
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <BillingFact
                label={<Trans message="Plan status" />}
                value={
                  <Badge variant={subscriptionStatusVariant(subscriptionStatus)}>
                    {subscriptionStatusLabel(subscriptionStatus)}
                  </Badge>
                }
              />
              <BillingFact
                label={<Trans message="Monthly price" />}
                value={
                  renewalPriceCents != null ? (
                    formatMoney(renewalPriceCents, currency)
                  ) : (
                    <Trans message="Not available" />
                  )
                }
              />
              <BillingFact
                label={<Trans message="Next renewal" />}
                value={
                  query.data?.pro_subscription?.renews_at ? (
                    <FormattedDate
                      preset="long"
                      date={query.data.pro_subscription.renews_at}
                    />
                  ) : query.data?.pro_subscription?.ends_at ? (
                    <FormattedDate
                      preset="long"
                      date={query.data.pro_subscription.ends_at}
                    />
                  ) : (
                    <Trans message="Not scheduled" />
                  )
                }
              />
            </div>

            {query.data?.pro_subscription?.pending_payment && (
              <p
                role="status"
                className="rounded-card-xs bg-warning/10 px-3 py-2 text-sm text-warning"
              >
                <span className="font-medium">
                  {billingPaymentStatus(
                    query.data.pro_subscription.pending_payment.status,
                  )}
                </span>
                <span aria-hidden="true"> · </span>
                <Trans
                  message=":amount due"
                  values={{
                    amount: formatMoney(
                      query.data.pro_subscription.pending_payment.amount_cents,
                      currency,
                    ),
                  }}
                />
              </p>
            )}

            {actionError && (
              <p role="alert" className="text-sm text-destructive">
                {actionError}
              </p>
            )}

            {startedAmountCents != null && (
              <p role="status" className="text-sm">
                <Trans
                  message="Pro payment created for :amount. Enter your transfer reference below."
                  values={{
                    amount: formatMoney(startedAmountCents, currency),
                  }}
                />
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {canRenew && (
                <Button
                  disabled={busy}
                  aria-busy={busy}
                  onClick={() => void startRenewal()}
                >
                  <Trans
                    message={isUpgrade ? 'Upgrade to Pro' : 'Renew Pro'}
                  />
                </Button>
              )}
              <Link
                className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                to="/pricing"
              >
                <Trans message="Compare plan benefits" />
              </Link>
            </div>

            {query.data?.corporate_account?.account_number && !usesChapa && (
              <div className="border-t pt-4 text-sm">
                <p className="font-medium">
                  <Trans message="Payment instructions" />
                </p>
                <p className="mt-1 text-muted-foreground">
                  <Trans
                    message="Send the Pro payment to :provider account :account."
                    values={{
                      provider:
                        query.data.corporate_account.provider.toUpperCase(),
                      account: query.data.corporate_account.account_number,
                    }}
                  />
                </p>
              </div>
            )}

            {pendingPaymentId && !usesChapa && (
              <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-end">
                <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm">
                  <Trans message="Pro payment reference" />
                  <Input
                    bindToHookForm={false}
                    value={proReference}
                    onChange={event => setProReference(event.target.value)}
                    placeholder="Transaction reference"
                  />
                </label>
                <Button
                  disabled={busy || !proReference.trim()}
                  onClick={() => void submitProReference()}
                >
                  <Trans message="Verify Pro payment" />
                </Button>
              </div>
            )}

            <section aria-labelledby="pro-payment-history-title" className="border-t pt-5">
              <div className="mb-2">
                <h3 id="pro-payment-history-title" className="font-medium">
                  <Trans message="Recent Pro payments" />
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  <Trans message="Verified subscription payment activity." />
                </p>
              </div>

              {payments.length ? (
                <div className="divide-y">
                  {payments.map(payment => (
                    <div
                      key={payment.payment_id}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="font-medium tabular-nums">
                          {formatMoney(
                            payment.amount_cents,
                            payment.currency,
                          )}
                        </p>
                        <p className="truncate text-sm text-muted-foreground">
                          <Trans
                            message="Reference: :reference"
                            values={{
                              reference:
                                payment.transaction_reference ?? '—',
                            }}
                          />
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <FormattedDate
                            date={payment.paid_at ?? payment.created_at}
                          />
                          {payment.provider
                            ? ` · ${payment.provider.toUpperCase()}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={billingPaymentBadgeVariant(payment.status)}
                        >
                          {billingPaymentStatus(payment.status)}
                        </Badge>
                        {payment.status === 'paid' &&
                          payment.receipt_url && (
                            <a
                              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                              href={payment.receipt_url}
                            >
                              <Trans message="Download receipt" />
                            </a>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="py-3 text-sm text-muted-foreground">
                  <Trans message="No Pro payments recorded yet." />
                </p>
              )}
            </section>
          </>
        )}
      </Card.Content>
    </Card.Root>
  );
}

function BillingFact({
  label,
  value,
}: {
  label: ReactNode;
  value: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}

function subscriptionStatusLabel(status: string): ReactNode {
  const labels: Record<string, ReactNode> = {
    active: <Trans message="Active" />,
    inactive: <Trans message="Inactive" />,
    past_due: <Trans message="Past due" />,
    expired: <Trans message="Expired" />,
    cancelled: <Trans message="Canceled" />,
  };

  return labels[status] ?? <Trans message="Status unavailable" />;
}

function subscriptionStatusVariant(
  status: string,
): 'positive' | 'destructive' | 'secondary' {
  if (status === 'active') return 'positive';
  if (status === 'past_due' || status === 'expired') return 'destructive';
  return 'secondary';
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

function billingPaymentBadgeVariant(
  status: string,
): 'positive' | 'destructive' | 'secondary' | 'outline' {
  if (status === 'paid') return 'positive';
  if (status === 'rejected' || status === 'expired') return 'destructive';
  if (status === 'manual_review') return 'outline';
  return 'secondary';
}

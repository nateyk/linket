import {User} from '@app/gen/schemas/user';
import {Badge} from '@shadcn/badge/badge';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {getSiteCurrency} from '@ui/i18n/format-money';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {ExternalLinkIcon} from 'lucide-react';
import {useOutletContext} from 'react-router';
import {BillingPlanPanel} from '../billing-plan-panel';

export function InvoiceHistoryPanel() {
  const data = useOutletContext<User>();
  const {base_url} = useSettings();

  const invoices = data.subscription?.invoices ?? [];

  return (
    <BillingPlanPanel title={<Trans message="Invoices" />}>
      {!invoices.length ? (
        <div className="py-2">
          <p className="font-medium">
            <Trans message="No invoices yet" />
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            <Trans message="Subscription invoices will appear here after a completed billing event." />
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {invoices.map(invoice => (
            <div
              className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
              key={invoice.id}
            >
              <div className="min-w-0">
                <p className="font-medium">
                  <FormattedDate date={invoice.created_at} />
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {data.subscription?.product?.name}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium tabular-nums">
                  <AmountPaid
                    invoice={invoice}
                    subscription={data.subscription!}
                  />
                </span>
                <Badge
                  variant={
                    invoice.status === 'paid' ? 'positive' : 'destructive'
                  }
                >
                  {invoice.status === 'paid' ? (
                    <Trans message="Paid" />
                  ) : (
                    <Trans message="Unpaid" />
                  )}
                </Badge>
                <a
                  href={`${base_url}/billing/invoices/${invoice.uuid}`}
                  target="_blank"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline"
                  rel="noreferrer"
                >
                  <Trans message="Open invoice" />
                  <ExternalLinkIcon className="size-4" aria-hidden="true" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </BillingPlanPanel>
  );
}

type AmountPaidProps = {
  invoice: NonNullable<
    NonNullable<User['subscription']>['invoices']
  >[number];
  subscription: NonNullable<User['subscription']>;
};

function AmountPaid({invoice, subscription}: AmountPaidProps) {
  const currency =
    invoice.currency ||
    subscription.price?.currency ||
    getSiteCurrency();

  if (invoice.amount_paid != null && invoice.currency != null) {
    return (
      <FormattedCurrency
        valueInCents={invoice.amount_paid}
        currency={currency}
      />
    );
  }

  if (subscription.price) {
    return (
      <FormattedCurrency
        value={subscription.price.amount}
        currency={currency}
      />
    );
  }

  return null;
}

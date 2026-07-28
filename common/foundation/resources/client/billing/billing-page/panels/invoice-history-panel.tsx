import {User} from '@app/gen/schemas/user';
import {Badge} from '@shadcn/badge/badge';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {FormattedDate} from '@ui/i18n/formatted-date';
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
      <div className="max-w-116">
        <div>
          {!invoices.length ? (
            <div className="text-muted-foreground italic">
              <Trans message="No invoices yet" />
            </div>
          ) : undefined}
          {invoices.map(invoice => (
            <div
              className="mb-3.5 flex items-center justify-between gap-2.5 text-base whitespace-nowrap"
              key={invoice.id}
            >
              <a
                href={`${base_url}/billing/invoices/${invoice.uuid}`}
                target="_blank"
                className="flex items-center gap-2 hover:underline"
                rel="noreferrer"
              >
                <FormattedDate date={invoice.created_at} />
                <ExternalLinkIcon className="size-4" />
              </a>
              <AmountPaid invoice={invoice} subscription={data.subscription!} />
              <Badge
                variant={invoice.status === 'paid' ? 'positive' : 'destructive'}
              >
                {invoice.status === 'paid' ? (
                  <Trans message="Paid" />
                ) : (
                  <Trans message="Unpaid" />
                )}
              </Badge>
              <div>{data.subscription?.product?.name}</div>
            </div>
          ))}
        </div>
      </div>
    </BillingPlanPanel>
  );
}

type AmountPaidProps = {
  invoice: NonNullable<NonNullable<User['subscription']>['invoices']>[number];
  subscription: NonNullable<User['subscription']>;
};
function AmountPaid({invoice, subscription}: AmountPaidProps) {
  const currency = invoice.currency || subscription.price?.currency || 'USD';
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

import {Badge} from '@shadcn/badge/badge';
import {Button} from '@shadcn/button/button';
import {Spinner} from '@shadcn/spinner/spinner';
import {formatMoney as formatPrice} from '@ui/i18n/format-money';
import {FormattedDate} from '@ui/i18n/formatted-date';
import {Trans} from '@ui/i18n/trans';
import {FlagIcon, MailIcon, StarIcon} from 'lucide-react';
import {useState} from 'react';
import {PortalPaymentDisputeDialog} from './portal-payment-dispute-dialog';

export type PortalOrdersTableOrder = {
  id: string;
  product_title: string | null;
  product_type?: string | null;
  currency: string;
  gross_amount_cents: number;
  paid_at: string | null;
  review: {
    stars: number | null;
    title: string | null;
    review: string | null;
  } | null;
  is_demo?: boolean;
};

function ProductTypeLabel({type}: {type?: string | null}) {
  if (type === 'course') {
    return <Trans message="Course" />;
  }
  if (type === 'audio') {
    return <Trans message="Audio" />;
  }
  if (type === 'download') {
    return <Trans message="Files" />;
  }
  return <Trans message="Purchase" />;
}

export function PortalOrdersTable({
  orders,
  busy,
  onResend,
  onReview,
}: {
  orders: PortalOrdersTableOrder[];
  busy?: string;
  onResend: (order: PortalOrdersTableOrder) => Promise<void>;
  onReview?: (order: PortalOrdersTableOrder) => void;
}) {
  const [disputeOrder, setDisputeOrder] = useState<PortalOrdersTableOrder>();

  if (!orders.length) {
    return (
      <p className="text-sm text-muted-foreground">
        <Trans message="Orders from your purchases will show up here." />
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-card border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">
            <Trans message="Order history" />
          </caption>
          <thead className="bg-secondary/50 text-left text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-medium">
                <Trans message="Order" />
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                <Trans message="Product" />
              </th>
              <th
                scope="col"
                className="hidden px-4 py-3 font-medium sm:table-cell"
              >
                <Trans message="Date" />
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                <Trans message="Status" />
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                <Trans message="Amount" />
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                <span className="sr-only">
                  <Trans message="Actions" />
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {orders.map(order => (
              <tr key={order.id}>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                  {order.id}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">
                    {order.product_title || <Trans message="Purchase" />}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <ProductTypeLabel type={order.product_type} />
                  </p>
                </td>
                <td className="hidden whitespace-nowrap px-4 py-3 text-muted-foreground sm:table-cell">
                  {order.paid_at ? (
                    <FormattedDate date={order.paid_at} />
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">
                    <Trans message="Paid" />
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {formatPrice(order.gross_amount_cents, order.currency)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {onReview && !order.is_demo ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onReview(order)}
                      >
                        <StarIcon data-icon="inline-start" />
                        {order.review ? (
                          <Trans message="Edit review" />
                        ) : (
                          <Trans message="Review" />
                        )}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy === `receipt-${order.id}`}
                      onClick={() => void onResend(order)}
                    >
                      {busy === `receipt-${order.id}` ? (
                        <Spinner />
                      ) : (
                        <MailIcon data-icon="inline-start" />
                      )}
                      <Trans message="Receipt" />
                    </Button>
                    {!order.is_demo ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDisputeOrder(order)}
                      >
                        <FlagIcon data-icon="inline-start" />
                        <Trans message="Report" />
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {disputeOrder ? (
        <PortalPaymentDisputeDialog
          orderId={disputeOrder.id}
          productTitle={disputeOrder.product_title}
          open={!!disputeOrder}
          onOpenChange={open => {
            if (!open) setDisputeOrder(undefined);
          }}
        />
      ) : null}
    </div>
  );
}

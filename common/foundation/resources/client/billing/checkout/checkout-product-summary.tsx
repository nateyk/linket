import {listProductsOptions} from '@common/admin/subscriptions/products-queries';
import {FormattedPrice} from '@common/billing/formatted-price';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {useSuspenseQuery} from '@tanstack/react-query';
import {FormattedCurrency} from '@ui/i18n/formatted-currency';
import {Trans} from '@ui/i18n/trans';
import {ProductFeatureList} from '../pricing-table/product-feature-list';

interface CheckoutProductSummaryProps {
  showBillingLine?: boolean;
}
export function CheckoutProductSummary({
  showBillingLine = true,
}: CheckoutProductSummaryProps) {
  const {productId, priceId} = useRequiredParams(['productId', 'priceId']);
  const productsQuery = useSuspenseQuery(listProductsOptions());

  const product = productsQuery.data?.data.find(p => `${p.id}` === productId);
  const price =
    product?.prices?.find(p => p.id === parseInt(priceId!)) ||
    product?.prices?.[0];

  if (!product || !price) {
    return null;
  }

  return (
    <div>
      <h2 className="mb-7.5 text-2xl">
        <Trans message="Summary" />
      </h2>

      <div className="mb-1.5 text-xl font-semibold">{product.name}</div>
      {product.description && (
        <div className="text-sm text-muted-foreground">
          {product.description}
        </div>
      )}
      <FormattedPrice
        priceClassName="font-bold text-4xl"
        periodClassName="text-muted-foreground text-xs"
        variant="separateLine"
        price={price}
        className="mt-8"
      />
      <ProductFeatureList product={product} />
      {showBillingLine && (
        <div className="mt-8 flex items-center justify-between gap-6 border-t pt-6 font-medium">
          <div>
            <Trans message="Billed today" />
          </div>
          <div>
            <FormattedCurrency value={price.amount} currency={price.currency} />
          </div>
        </div>
      )}
    </div>
  );
}

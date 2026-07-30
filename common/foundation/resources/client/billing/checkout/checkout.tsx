import {listProductsOptions} from '@common/admin/subscriptions/products-queries';
import {useRequiredParams} from '@common/ui/navigation/use-required-params';
import {useSuspenseQuery} from '@tanstack/react-query';
import {Trans} from '@ui/i18n/trans';
import {useSettings} from '@ui/settings/use-settings';
import {Navigate} from 'react-router';
import {CheckoutLayout} from './checkout-layout';
import {CheckoutProductSummary} from './checkout-product-summary';
import {ChapaCheckoutForm} from './chapa/chapa-checkout-form';

export function Component() {
  const {productId, priceId} = useRequiredParams(['productId', 'priceId']);
  const productsQuery = useSuspenseQuery(listProductsOptions());
  const {billing} = useSettings();

  const product = productsQuery.data?.data.find(p => `${p.id}` === productId);
  const price = product?.prices?.find(p => `${p.id}` === priceId);

  // make sure product and price exists in backend
  if (!product || !price) {
    return <Navigate to="/pricing" replace />;
  }

  return (
    <CheckoutLayout>
      <>
        <h1 className="mb-10 text-4xl">
          <Trans message="Checkout" />
        </h1>
        {billing?.chapa?.enable ? <ChapaCheckoutForm productId={productId} priceId={priceId} /> : null}
        <div className="mt-7.5 text-xs text-muted-foreground">
          <Trans message="You’ll be charged until you cancel your subscription. Previous charges won’t be refunded when you cancel unless it’s legally required. Your payment data is encrypted and secure. By subscribing your agree to our terms of service and privacy policy." />
        </div>
      </>
      <CheckoutProductSummary />
    </CheckoutLayout>
  );
}

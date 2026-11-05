/**
 * A zero-price order is fulfilled synchronously by StorefrontCheckout before
 * its successful response. The public endpoint returns an order ID and may
 * still return verification-only fields for historical compatibility.
 *
 * Recognize free completion before interpreting those fields as paid
 * payment instructions. Never put the order access token in a URL.
 */
export function isSuccessfulFreeCheckoutResponse(
  paymentMode: 'direct' | 'free' | 'unavailable' | undefined,
  payload: unknown,
): boolean {
  return (
    paymentMode === 'free' &&
    typeof payload === 'object' &&
    payload !== null &&
    'order_id' in payload &&
    typeof payload.order_id === 'string' &&
    payload.order_id.length > 0
  );
}

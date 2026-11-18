/**
 * Free storefront checkout fulfills on the server before a successful POST.
 * Validate the free-order identifier before showing completion; never send a
 * free buyer into a paid Chapa checkout on a malformed response.
 *
 * This is a UI response classification, not entitlement authorization.
 * My Portal still requires server-side buyer-email verification for recovery.
 */
export function isSuccessfulFreeCheckoutResponse(
  paymentMode: 'direct' | 'free' | 'unavailable' | undefined,
  payload: unknown,
): boolean {
  if (paymentMode !== 'free' || typeof payload !== 'object' || payload === null) {
    return false;
  }

  if (!('order_id' in payload) || typeof payload.order_id !== 'string') {
    return false;
  }

  return payload.order_id.trim().length > 0;
}

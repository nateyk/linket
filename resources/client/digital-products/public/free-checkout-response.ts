/**
 * Free storefront checkout fulfills on the server before a successful POST.
 * Legacy Verify.et responses may still contain payment instructions and an
 * access token, or even a stale "pending_payment" status. Those fields must
 * not route a *free* buyer into the paid verification dialog.
 *
 * This is only a UI classification of a successful HTTP response, not a
 * permission check or an entitlement grant. My Portal requires verified
 * buyer-email recovery on the server.
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

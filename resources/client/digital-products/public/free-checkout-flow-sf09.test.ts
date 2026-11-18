import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const page = fs.readFileSync(
  path.resolve(
    'resources/client/digital-products/public/digital-product-public-pages.tsx',
  ),
  'utf8',
);
const pricing = fs.readFileSync(
  path.resolve(
    'resources/client/digital-products/public/product-page/product-pricing-card.tsx',
  ),
  'utf8',
);

describe('SF-09 free checkout recovery and paid-flow isolation', () => {
  test('fulfills free checkout before hosted Chapa redirect and never opens legacy payment UI', () => {
    const responseIndex = page.indexOf('const payload = response.data;');
    const freeIndex = page.indexOf(
      "if (data.product.payment_mode === 'free') {",
      responseIndex,
    );
    const hostedCheckoutIndex = page.indexOf('window.location.assign(checkoutUrl)', responseIndex);

    expect(responseIndex).toBeGreaterThan(0);
    expect(freeIndex).toBeGreaterThan(responseIndex);
    expect(hostedCheckoutIndex).toBeGreaterThan(freeIndex);
    expect(page).toContain('isSuccessfulFreeCheckoutResponse');
    expect(page).toContain('setFreeCheckoutComplete(true)');
    expect(page).toContain('setBuyerDialogOpen(false)');
    expect(page).not.toContain('DirectPaymentModal');
    expect(page).not.toContain('reference_endpoint');
    expect(page).not.toContain('creator_payment_method_id');
    expect(page).not.toContain('Payment destination');
  });

  test('provides a safe portal route after free checkout without leaking the order token', () => {
    expect(page).toContain('role="status"');
    expect(page).toContain('aria-live="polite"');
    expect(page).toContain('to="/my-portal"');
    expect(page).toContain('Use your checkout email in My Portal');
    expect(page).not.toContain('access_token=${payload.access_token}');
    expect(page).not.toContain('token=${payload.access_token}');
    expect(page).not.toContain('checkout_url=${payload.checkout_url}');
  });

  test('prevents re-claiming an already completed free order and hides the sticky duplicate', () => {
    expect(page).toContain('if (submitting || freeCheckoutComplete) return;');
    expect(page).toContain('completed={freeCheckoutComplete}');
    expect(page).toContain('disabled={submitting || data.product.can_buy === false || freeCheckoutComplete}');
    expect(page).toContain("freeCheckoutComplete\n              ? 'invisible translate-y-full'");
    expect(pricing).toContain('disabled={submitting || product.can_buy === false || completed}');
  });

  test('keeps paid checkout details and distinguishes free buyer copy by payment mode', () => {
    expect(page).toContain("data.product.payment_mode === 'unavailable'");
    expect(page).toContain('No payment details are needed for this free product.');
    expect(page).toContain('Continue for free');
    expect(page).toContain('Show payment details');
    expect(pricing).toContain('Free access, no payment required');
    expect(pricing).toContain('One-time payment, no subscription');
    expect(pricing).toContain('Receipt and download links by email');
  });
});

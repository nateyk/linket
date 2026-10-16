import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('public course curriculum', () => {
  test('loads curriculum through the shared API client', () => {
    const page = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/digital-product-public-pages.tsx',
      ),
      'utf8',
    );

    expect(page).toContain(
      "import {apiClient} from '@common/http/query-client';",
    );
    expect(page).toMatch(
      /await apiClient\.get\(\s*`\/api\/v1\/public\/courses\/\$\{courseId\}\/curriculum`\s*,?\s*\)/,
    );
  });
});

describe('public order status polling', () => {
  test('polls order status through the shared API client', () => {
    const page = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/digital-product-public-pages.tsx',
      ),
      'utf8',
    );

    expect(page).toMatch(/await apiClient\.get\(\s*data\.status_endpoint\s*\)/);
  });
});

describe('public checkout', () => {
  test('starts checkout through the shared API client', () => {
    const page = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/digital-product-public-pages.tsx',
      ),
      'utf8',
    );

    expect(page).toMatch(/await apiClient\.post\(\s*data\.checkout_endpoint/);
    expect(page).toMatch(
      /`\/api\/v1\/digital-products\/\$\{data\.product\.id\}\/checkout`/,
    );
  });
});

const readPage = () =>
  fs.readFileSync(
    path.resolve(
      'resources/client/digital-products/public/digital-product-public-pages.tsx',
    ),
    'utf8',
  );

describe('buyer payment dialog', () => {
  test('recaps the order and names the off-site redirect', () => {
    const page = readPage();

    // The buyer sees the product and the formatted total before handing over PII.
    expect(page).toContain('product.cover?.url');
    expect(page).toContain(
      'formatPrice(product.price_cents, product.currency)',
    );
    // The submit action admits that payment happens on the provider's page.
    expect(page).toContain("'Continue to secure checkout'");
    expect(page).toContain(
      "You'll continue to Chapa's secure checkout to pay, then return to this page.",
    );
    // The dialog names the counterparty: store identity travels with the
    // product recap, and the provider is named (Chapa powers checkout).
    expect(page).toContain('Sold by :store');
    // Facts only: instant delivery with refunds at the creator's discretion
    // is the single refund stance this repo can state — no money-back
    // guarantee or refund window may be promised.
    expect(page).toContain(
      "Digital delivery is instant; refunds are at the creator's discretion.",
    );
    expect(page).not.toMatch(/money-back|guarantee|refund window/i);
  });

  test('keeps a visible, translated close control and the mid-submit guard', () => {
    const page = readPage();

    expect(page).toMatch(
      /<Dialog\.CloseButton[\s\S]{0,400}?disabled=\{submitting\}/,
    );
    expect(page).toContain("trans({message: 'Close dialog'})");
    expect(page).toMatch(
      /onOpenChange=\{nextOpen => \{\s*if \(!submitting \|\| nextOpen\) \{/,
    );
  });
});

describe('painted-panel colors and locale safety', () => {
  test('scopes alert colors to biolink tokens with css fallbacks', () => {
    const page = readPage();

    expect(page).toContain(
      'border-[var(--biolink-border,var(--color-border))]!',
    );
    expect(page).toContain(
      'text-[var(--biolink-muted-text,var(--color-muted-foreground))]!',
    );
    expect(page).toContain('text-[var(--biolink-accent,var(--color-primary))]');
    expect(page).toContain('message="Your course is ready"');
    expect(page).toContain('message="Your download is ready"');
    expect(page).toContain('message="Open My Orders"');
    expect(page).not.toContain('backdrop-blur');
    expect(page).not.toContain('shadow-xs');
    // The phone bar tracks the buy button, not the whole rail, so the
    // action returns as soon as the button scrolls away.
    expect(page).toContain('observer.observe(action)');
  });

  test('uses the shared locale-aware formatters', () => {
    const page = readPage();

    expect(page).toContain(
      "import {FormattedDate} from '@ui/i18n/formatted-date';",
    );
    expect(page).not.toContain('Intl.DateTimeFormat(undefined');
    expect(page).not.toContain('aria-label="Order summary"');
    // Duration units go through Trans instead of hardcoded English.
    expect(page).not.toContain('}h ${String(minutes)');
    expect(page).toContain('message=":minutes min"');
  });

  test('wraps the page tree in a reduced-motion config', () => {
    expect(readPage()).toContain('<MotionConfig reducedMotion="user">');
  });
});

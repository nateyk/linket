import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const readSource = () =>
  fs.readFileSync(
    path.resolve('resources/client/digital-products/public/product-reviews-block.tsx'),
    'utf8',
  );

describe('public product reviews', () => {
  test('loads reviews through the shared API client', () => {
    expect(readSource()).toMatch(
      /await apiClient\.get(?:<ReviewsResponse>)?\(\s*baseUrl\s*,?\s*\)/,
    );
  });

  test('renders the failure through Trans with a retry that re-runs the fetch', () => {
    const source = readSource();

    expect(source).toContain('<Trans message="Unable to load reviews." />');
    // The raw, untranslated string state is gone.
    expect(source).not.toMatch(/setError\(['"`]Unable to load reviews/);
    // Retry re-invokes the same callback the mount effect runs.
    expect(source).toMatch(/onClick=\{\(\) => void load\(\)\}/);
    // The failure names the problem in the destructive token, not muted text.
    expect(source).toContain('text-sm text-destructive');
    expect(source).toContain('border-destructive/30');
  });

  test('uses the shared locale-aware date formatter', () => {
    const source = readSource();

    expect(source).toContain(
      "import {FormattedDate} from '@ui/i18n/formatted-date';",
    );
    expect(source).not.toContain('Intl.DateTimeFormat(undefined');
    expect(source).not.toContain('function formatDate');
  });

  test('one ringed container per card: inner groups are plain bordered groups', () => {
    const source = readSource();

    // The reviews Card.Root is the only ring; the histogram and the review
    // list are flattened to border/divide sections inside it.
    expect(source).not.toContain('ring-1');
    expect(source).toContain(
      'divide-y divide-[var(--biolink-border)] rounded-card border border-[var(--biolink-border)]',
    );
    expect(source).toContain(
      'rounded-card border border-[var(--biolink-border)] p-5',
    );
  });

  test('the My Orders link paints from the biolink accent, never bare text-primary', () => {
    const source = readSource();

    expect(source).toContain(
      'text-[var(--biolink-accent,var(--color-primary))]',
    );
    expect(source).not.toContain('text-primary');
    // The helper sentence sits at the 14px control size, not 12px metadata.
    expect(source).toContain('text-center text-sm text-[var(--biolink-muted-text)]');
  });
});

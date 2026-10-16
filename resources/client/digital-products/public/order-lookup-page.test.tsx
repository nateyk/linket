import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('my-order recovery', () => {
  test('requests and verifies codes through the shared API client', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/order-lookup-page.tsx',
      ),
      'utf8',
    );

    expect(source).toMatch(
      /await apiClient\.post\(\s*'\/api\/v1\/public\/my-order\/request-code'/,
    );
    expect(source).toMatch(
      /await apiClient\.post\(\s*'\/api\/v1\/public\/my-order\/verify-code'/,
    );
  });

  test('loads purchases through the shared API client', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/order-lookup-page.tsx',
      ),
      'utf8',
    );

    expect(source).toMatch(
      /await apiClient\.get\(\s*'\/api\/v1\/public\/my-order\/purchases'\s*\)/,
    );
  });
});

describe('my-order protected actions', () => {
  test('handles downloads, receipts, and reviews through the shared API client', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/digital-products/public/order-lookup-page.tsx',
      ),
      'utf8',
    );

    expect(source).toMatch(
      /await apiClient\.post\(\s*`\/api\/v1\/public\/my-order\/purchases\/\$\{order\.id\}\/downloads\/\$\{entitlement\.id\}`/,
    );
    expect(source).toMatch(
      /await apiClient\.post\(\s*`\/api\/v1\/public\/my-order\/purchases\/\$\{order\.id\}\/resend-receipt`/,
    );
    expect(source).toMatch(
      /await apiClient\.post\(\s*`\/api\/v1\/public\/my-order\/purchases\/\$\{order\.id\}\/review`/,
    );
    expect(source.match(/<RecoveryProblem error=\{error\} \/>/g)).toHaveLength(
      2,
    );
    expect(source).toContain('Enter the 6-digit code from your email.');
    expect(source).not.toContain('fill-amber-400');
    expect(source).not.toContain('certificate');
    expect(source).not.toContain('-mt-2');
  });
});

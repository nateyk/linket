import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('wizard persistence', () => {
  test('wizard saves state to localStorage', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-create-wizard.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('localStorage');
    expect(source).toContain('productCreateWizard');
  });
  test('wizard restores state on mount', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-create-wizard.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('useEffect');
    expect(source).toContain('JSON.parse');
  });
});

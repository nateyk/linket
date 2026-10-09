import fs from 'node:fs';
import {describe, test, expect} from 'vitest';

const source = fs.readFileSync(
  'resources/client/admin/settings/app-general-settings.tsx',
  'utf8',
);

describe('dashboard homepage setting option', () => {
  test('offers the renamed items option', () => {
    expect(source).toContain("value: 'items'");
    expect(source).toContain('<Trans message="My Items" />');
  });

  test('normalizes the legacy stored value through the shared helper', () => {
    expect(source).toContain('normalizeHomepageValue');
  });
});

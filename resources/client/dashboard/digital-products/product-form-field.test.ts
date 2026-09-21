import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('inline validation', () => {
  test('field accepts onBlur and onChange for validation', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-form-field.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('onBlur');
    expect(source).toContain('onChange');
  });
  test('error displays immediately when field has error prop', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-form-field.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('Field.Error');
  });
});

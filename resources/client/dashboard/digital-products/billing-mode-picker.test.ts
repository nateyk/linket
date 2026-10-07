import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const dir = 'resources/client/dashboard/digital-products';

function read(name: string): string {
  return fs.readFileSync(path.resolve(dir, name), 'utf8');
}

describe('billing mode picker', () => {
  test('offers Free and Paid as single-select radio rows', () => {
    const source = read('billing-mode-picker.tsx');
    expect(source).toContain('RadioGroup');
    expect(source).toContain('RadioGroupItem');
    expect(source).toContain('onValueChange');
    expect(source).toContain("'free'");
    expect(source).toContain("'paid'");
    expect(source).toContain('OptionRowContent');
  });
  test('type picker rows render through the shared row component', () => {
    expect(read('product-type-picker.tsx')).toContain('OptionRowContent');
    expect(read('product-type-picker.tsx')).toContain(
      'onValueChange: (value: ProductType | null) => void',
    );
  });
});

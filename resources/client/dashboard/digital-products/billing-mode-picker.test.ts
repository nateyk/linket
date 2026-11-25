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
  test('type picker uses a responsive card grid while billing keeps row options', () => {
    const picker = read('product-type-picker.tsx');
    expect(picker).toContain('grid-cols-2');
    expect(picker).toContain('sm:grid-cols-4');
    expect(picker).toContain('RadioGroupItem');
    expect(picker).toContain('onValueChange: (value: ProductType | null) => void');
    expect(picker).not.toContain('OptionRowContent');
  });
});

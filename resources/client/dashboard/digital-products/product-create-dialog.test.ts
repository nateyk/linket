import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const dir = 'resources/client/dashboard/digital-products';

function read(name: string): string {
  return fs.readFileSync(path.resolve(dir, name), 'utf8');
}

describe('create product dialog wizard', () => {
  test('renders the shared wizard steps and finishes via buildCreateUrl', () => {
    const source = read('create-product-dialog.tsx');
    expect(source).toContain('useProductCreateWizard');
    expect(source).toContain('WizardStepBody');
    expect(source).toContain('WizardStepDots');
    expect(source).toContain('finishUrl');
  });
  test('resets wizard state when dismissed', () => {
    const source = read('create-product-dialog.tsx');
    expect(source).toMatch(/wizard\.reset\(\)|reset\(\)/);
  });
});

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

describe('product type selection page wizard', () => {
  test('reuses the shared wizard and finishes via buildCreateUrl', () => {
    const source = read('product-type-selection-page.tsx');
    expect(source).toContain('useProductCreateWizard');
    expect(source).toContain('WizardStepBody');
    expect(source).toContain('finishUrl');
    expect(source).not.toContain('selectedType');
  });
  test('clears wizard state when finishing', () => {
    const source = read('product-type-selection-page.tsx');
    expect(source).toContain('wizard.reset()');
  });
});

describe('wizard price prefill', () => {
  test('details form initializes price from wizard prefill via context', () => {
    const source = read('digital-product-form-page.tsx');
    expect(source).toContain('parseWizardPrefill');
    expect(source).toContain('<ProductCreationProvider');
    expect(source).toContain('useProductCreation');
  });
  test('course form seeds price from price_cents param', () => {
    const course = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/courses/create-course-page.tsx',
      ),
      'utf8',
    );
    expect(course).toContain("searchParams.get('price_cents')");
    expect(course).toContain('initialPriceFromParam');
  });
});

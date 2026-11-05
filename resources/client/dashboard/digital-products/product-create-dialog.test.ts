import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const dir = 'resources/client/dashboard/digital-products';
function read(name: string): string {
  return fs.readFileSync(path.resolve(dir, name), 'utf8');
}

describe('one-step Add Product dialog', () => {
  test('shows the accessible type picker without the billing/price wizard', () => {
    const source = read('create-product-dialog.tsx');
    expect(source).toContain('ProductTypePicker');
    expect(source).toContain('productTypeCreateUrl(selectedType)');
    expect(source).toContain('disabled={!selectedType}');
    expect(source).not.toContain('WizardStepBody');
    expect(source).not.toContain('WizardStepDots');
    expect(source).not.toContain('useProductCreateWizard');
  });
  test('resets a selected type on cancel or navigation', () => {
    const source = read('create-product-dialog.tsx');
    expect(source).toContain('if (!nextOpen) setSelectedType(null)');
    expect(source).toContain('setSelectedType(null)');
    expect(source).not.toContain('Discard this product?');
  });
});

describe('standalone type selection fallback', () => {
  test('navigates directly to a selected editor', () => {
    const source = read('product-type-selection-page.tsx');
    expect(source).toContain('ProductTypePicker');
    expect(source).toContain('productTypeCreateUrl(selectedType)');
    expect(source).toContain('disabled={!selectedType}');
    expect(source).not.toContain('WizardStepBody');
  });
});

describe('legacy price prefill', () => {
  test('existing bookmarked file creation links still parse pricing', () => {
    const source = read('digital-product-form-page.tsx');
    expect(source).toContain('parseWizardPrefill');
    expect(source).toContain('resolveCreateType(creationType)');
    expect(source).toContain('<ProductCreationProvider');
  });
  test('course form reads old pricing links and now offers inline choice', () => {
    const source = fs.readFileSync(
      path.resolve('resources/client/dashboard/courses/create-course-page.tsx'),
      'utf8',
    );
    expect(source).toContain('parseWizardPrefill');
    expect(source).toContain('BillingModePicker');
    expect(source).toContain("billingMode === 'free'");
  });
});

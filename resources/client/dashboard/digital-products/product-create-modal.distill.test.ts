/**
 * Distill contract for the product-create modal: one decision per step,
 * no Free-plan / Free-access collision, no premature "Product setup" chrome.
 */
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const root = path.resolve('resources/client/dashboard/digital-products');

function read(name: string): string {
  return fs.readFileSync(path.join(root, name), 'utf8');
}

describe('create modal distill: one decision per step', () => {
  test('step meta titles are questions; type/billing carry no restating description', () => {
    const source = read('product-create-wizard.tsx');
    expect(source).toContain("title: 'What are you selling?'");
    expect(source).toContain("title: 'Free or paid?'");
    expect(source).toContain("title: 'Set your price'");
    // Distill: options carry the meaning — no second paragraph on type/billing.
    expect(source).not.toContain(
      'Choose the best format for what you want to sell.',
    );
    expect(source).not.toContain('How will people access this product?');
    // Price keeps the one fact the field alone does not say.
    expect(source).toContain('You can change it later.');
  });

  test('dialog uses one concise description and no second wizard decision', () => {
    const dialog = read('create-product-dialog.tsx');
    expect(dialog).toContain('<Dialog.Description>');
    expect(dialog).toContain('Choose a type to open its editor.');
    expect(dialog).not.toContain('WizardStepDots');
    expect(dialog).not.toContain('WizardStepBody');
  });

  test('picker cards stay flat — no resting shadow', () => {
    expect(read('product-type-picker.tsx')).not.toContain('shadow-xs');
    expect(read('billing-mode-picker.tsx')).not.toContain('shadow-xs');
  });

  test('billing copy never equates free access with the Free plan', () => {
    const billing = read('billing-mode-picker.tsx');
    expect(billing).toContain('Free access');
    expect(billing).toContain('Buyers pay nothing.');
    // No commission soft-sell in the decision step (facts live on plans UI).
    expect(billing).not.toMatch(/10\s*%|5\s*%|commission/i);
    expect(billing).not.toMatch(/Free plan|Pro plan/i);
  });
});

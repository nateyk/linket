// resources/client/dashboard/digital-products/product-form-primitives.test.ts
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const fieldSource = fs.readFileSync(
  path.resolve(
    'resources/client/dashboard/digital-products/product-form-field.tsx',
  ),
  'utf8',
);
const sectionSource = fs.readFileSync(
  path.resolve(
    'resources/client/dashboard/digital-products/product-form-section.tsx',
  ),
  'utf8',
);

describe('product form primitives', () => {
  test('field wires label, description, and invalid state through shadcn Field', () => {
    expect(fieldSource).toContain("from '@shadcn/forms/field'");
    expect(fieldSource).toContain('Field.Root');
    expect(fieldSource).toContain('Field.Label');
    expect(fieldSource).toContain('Field.Description');
    expect(fieldSource).toContain('Field.Error');
    expect(fieldSource).toContain('invalid={');
  });
  test('section reuses accordion, builder header, and badge', () => {
    expect(sectionSource).toContain("from '@shadcn/accordion/accordion'");
    expect(sectionSource).toContain('BuilderSectionHeader');
    expect(sectionSource).toContain("from '@shadcn/badge/badge'");
    expect(sectionSource).toContain('Accordion.Item');
    expect(sectionSource).toContain('Accordion.Trigger');
    expect(sectionSource).toContain('Accordion.Content');
  });
  test('primitives carry no raw visual values', () => {
    for (const source of [fieldSource, sectionSource]) {
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/);
      expect(source).not.toMatch(/rounded-\[/);
      expect(source).not.toMatch(/shadow-\[/);
      expect(source).not.toMatch(/bg-(blue|gray|white|black)-/);
    }
  });
});

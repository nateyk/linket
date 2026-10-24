// resources/client/dashboard/digital-products/product-creation-context.test.ts
import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';
import {resolveInitialFormState} from './product-creation-context';

describe('resolveInitialFormState', () => {
  test('applies wizard prefill for a fresh product', () => {
    expect(
      resolveInitialFormState({
        type: 'ebook',
        billing: 'paid',
        price: '19.99',
      }),
    ).toEqual({
      title: '',
      description: '',
      price: '19.99',
      coverUrl: '',
      coverFileId: null,
      files: [],
      samples: [],
      biolinkIds: [],
      productType: 'ebook',
    });
  });
  test('falls back to digital with empty price when prefill is absent', () => {
    expect(resolveInitialFormState(null)).toMatchObject({
      productType: 'digital',
      price: '',
    });
  });
});

describe('product creation provider wiring', () => {
  test('exports a provider, hook, and state actions', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-creation-context.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('ProductCreationProvider');
    expect(source).toContain('useProductCreation');
    expect(source).toContain('setBiolinkIds');
    expect(source).toContain('must be used within ProductCreationProvider');
  });
});

describe('auto-save drafts', () => {
  test('context exports dirty state and autoSave action', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-creation-context.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('dirty');
    expect(source).toContain('setDirty');
    expect(source).toContain('autoSave');
  });
  test('autoSave debounces at 1500ms', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/digital-products/product-creation-context.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('1500');
    expect(source).toContain('debounce');
  });
});

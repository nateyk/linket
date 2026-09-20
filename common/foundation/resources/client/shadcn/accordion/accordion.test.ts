import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('accordion connector line', () => {
  test('bordered variant items have connector line slot', () => {
    const source = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/shadcn/accordion/accordion.tsx',
      ),
      'utf8',
    );
    expect(source).toContain('data-slot="accordion-connector"');
    expect(source).toContain('data-variant={variant}');
  });
  test('connector only rendered in bordered variant', () => {
    const source = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/shadcn/accordion/accordion.tsx',
      ),
      'utf8',
    );
    expect(source).toContain("variant === 'bordered'");
  });
});

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
  test('bordered trigger hovers with text color, not a background fill', () => {
    const source = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/shadcn/accordion/accordion.tsx',
      ),
      'utf8',
    );
    expect(source).toContain(
      'group-data-[variant=bordered]/accordion:hover:text-primary',
    );
    expect(source).not.toContain(
      'group-data-[variant=bordered]/accordion:hover:bg-accent/80',
    );
  });
});

describe('builder section header icon', () => {
  test('completed sections keep their own icon with a green tint', () => {
    const source = fs.readFileSync(
      path.resolve(
        'resources/client/dashboard/stores/store-editor/builder-section-header.tsx',
      ),
      'utf8',
    );
    expect(source).not.toContain('CheckIcon');
    expect(source).toContain('<Icon className="size-4" />');
    expect(source).toContain("isComplete && 'bg-primary/10 text-primary'");
  });
});

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
  test('root shell classes come from the variant prop, not inert data-variant selectors', () => {
    const source = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/shadcn/accordion/accordion.tsx',
      ),
      'utf8',
    );
    // data-[variant=…] selector tokens would sit in the class list of every
    // variant: a separated root would still read as a card shell (rounded +
    // border) around its separated items. The prop applies the same styles
    // only where they belong.
    expect(source).toContain("variant === 'bordered' && 'rounded-card border'");
    expect(source).toContain("variant === 'separated' && 'gap-3'");
    expect(source).not.toContain('data-[variant=bordered]:rounded-card');
    expect(source).not.toContain('data-[variant=bordered]:border');
    expect(source).not.toContain('data-[variant=separated]:gap-3');
  });
  test('item card classes follow the root variant via context, not inert group-data selectors', () => {
    const source = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/shadcn/accordion/accordion.tsx',
      ),
      'utf8',
    );
    // group-data-[variant=…] card tokens would sit in the class list of every
    // item regardless of the root's variant: inside a bordered root they read
    // as rounded cards nested in the shell (nested-cards finding). The item
    // reads the root variant from context so the tokens only render — and
    // only appear in the markup — when they actually apply.
    expect(source).toContain("rootVariant === 'separated'");
    expect(source).toContain(
      "'rounded-card-sm border p-2 data-open:border-foreground/15 data-open:shadow'",
    );
    expect(source).not.toContain(
      'group-data-[variant=separated]/accordion:rounded-card-sm',
    );
    expect(source).not.toContain(
      'group-data-[variant=separated]/accordion:border',
    );
  });
  test('separated items inset their children off the card frame', () => {
    const source = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/shadcn/accordion/accordion.tsx',
      ),
      'utf8',
    );
    // Cramped-padding: an overflow-hidden card whose child boxes sit flush
    // against the border reads as "no inset". The item's own p-2 keeps every
    // child's box off the frame; the trigger takes a matching radius so its
    // now-inset hover fill follows the card corners.
    expect(source).toContain(
      "'rounded-card-sm border p-2 data-open:border-foreground/15 data-open:shadow'",
    );
    expect(source).toContain("rootVariant === 'separated' && 'rounded-card-sm'");
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

import fs from 'node:fs';
import {describe, expect, test} from 'vitest';

// DESIGN.md: "Fields are softly squared ... visibly tighter than buttons, so an
// input never reads as a button." The only sanctioned exception is the Square
// theme (`.radius-none`), where every surface is 0.
//
// This guards the defect the previous pass fixed by *removing* options: the
// `sm` and `md` steps used to make --be-radius-input equal --be-radius-button,
// which is exactly why they were pulled from the admin picker.
const css = fs.readFileSync(
  'common/foundation/resources/client/core/common-tailwind.css',
  'utf8',
);

// Tailwind v4 default radius scale, in px.
const radiusPx: Record<string, number> = {
  xs: 2,
  sm: 4,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16,
  '3xl': 24,
};

function radiusTokenFor(rule: string, property: string): string {
  const block = css.match(new RegExp(`\\.${rule}\\s*\\{([^}]*)\\}`))?.[1];
  expect(block, `expected a .${rule} block in common-tailwind.css`).toBeTruthy();
  const token = block!.match(
    new RegExp(`--${property}:\\s*var\\(--radius-([a-z0-9]+)\\)`),
  )?.[1];
  expect(token, `expected ${property} to use a radius token`).toBeTruthy();
  return token!;
}

function px(rule: string, property: string): number {
  const block = css.match(new RegExp(`\\.${rule}\\s*\\{([^}]*)\\}`))?.[1];
  const token = radiusTokenFor(rule, property);
  // `.radius-none` remaps the underlying --radius-* tokens to 0 inside its own
  // block, so a local override wins over the Tailwind default scale.
  const override = block?.match(
    new RegExp(`--radius-${token}:\\s*([0-9.]+)(rem|px)?`),
  );
  if (override) {
    return override[2] === 'px'
      ? Number(override[1])
      : Number(override[1]) * 16;
  }
  const value = radiusPx[token];
  expect(value, `unknown radius token --radius-${token}`).toBeTypeOf('number');
  return value;
}

describe('theme radius family keeps fields tighter than buttons', () => {
  // The steps the admin picker can select. `md` is intentionally not offered
  // (and not covered) — see themes-settings.roundness.test.ts.
  const selectableSteps = ['sm', 'lg'];

  test('the Square step is all-zero (the sanctioned exception)', () => {
    expect(px('radius-none', 'be-radius-button')).toBe(0);
    expect(px('radius-none', 'be-radius-input')).toBe(0);
  });

  for (const step of selectableSteps) {
    test(`.radius-${step}: input radius is strictly tighter than button radius`, () => {
      expect(px(`radius-${step}`, 'be-radius-input')).toBeLessThan(
        px(`radius-${step}`, 'be-radius-button'),
      );
    });
  }
});

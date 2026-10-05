import {readFileSync} from 'node:fs';
import {expect, test} from 'vitest';

const css = readFileSync(new URL('./app.css', import.meta.url), 'utf8');

/**
 * Global reduced-motion contract (A-17). Durations collapse to ~0 rather
 * than `none`: elements keep reaching their end state, transitionend still
 * fires, and motion-based verification sees nothing get stuck.
 */
test('app.css collapses motion under prefers-reduced-motion (A-17)', () => {
  expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  expect(css).toMatch(/animation-duration:\s*0\.01ms/);
  expect(css).toMatch(/transition-duration:\s*0\.01ms/);
  expect(css).toMatch(/animation-iteration-count:\s*1/);
  expect(css).toMatch(/scroll-behavior:\s*auto/);

  expect(css).not.toMatch(/(?:animation|transition)-duration:\s*none/);
});

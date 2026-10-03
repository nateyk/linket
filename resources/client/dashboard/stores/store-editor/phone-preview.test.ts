import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve(
    'resources/client/dashboard/stores/store-editor',
    'phone-preview.tsx',
  ),
  'utf8',
);

describe('phone preview frame', () => {
  test('the frame is the device artwork, not CSS chrome', () => {
    expect(source).toContain("from './iphone-14-pro-back.svg'");
    expect(source).toContain("from './iphone-14-pro-front.svg'");
    // Bezel, side buttons and island are drawn by the SVGs now.
    expect(source).not.toMatch(/border-\[6px\]/);
    expect(source).not.toMatch(/rounded-\[2\.5rem\]/);
    expect(source).not.toMatch(/rounded-\[2rem\]/);
  });

  test('the page renders at a true 393x852 viewport', () => {
    expect(source).toContain('const SCREEN_WIDTH = 393');
    expect(source).toContain('const SCREEN_HEIGHT = 852');
    // scale() alone would leave media queries reading the editor's window
    // width, so the scale is published as a custom property the transform
    // reads, and derived from the screen box via a ResizeObserver.
    expect(source).toContain('screenWidth / SCREEN_WIDTH');
    expect(source).toContain('new ResizeObserver');
    expect(source).toContain('transform: \'scale(var(--s))\'');
    expect(source).toContain("'--s': scale");
  });

  test('the screen is the only clipped box', () => {
    // Exactly one overflow-hidden in the file, and it is the screen.
    const matches = source.match(/overflow-hidden/g) ?? [];
    expect(matches).toHaveLength(1);
    expect(source).toContain('screen absolute z-[1] overflow-hidden');
  });

  test('the screen box matches the artwork bezel', () => {
    expect(source).toContain("left: '5.251%'");
    expect(source).toContain("top: '2.2446%'");
    expect(source).toContain("width: '89.498%'");
    expect(source).toContain("height: '95.511%'");
    expect(source).toContain("borderRadius: '13.475% / 6.227%'");
  });

  test('device insets are published for the page inside', () => {
    expect(source).toContain("const SAFE_TOP = '59px'");
    expect(source).toContain("const SAFE_BOTTOM = '34px'");
    expect(source).toContain("'--safe-top': SAFE_TOP");
    expect(source).toContain("'--safe-bottom': SAFE_BOTTOM");
  });

  test('chrome never intercepts clicks meant for the page', () => {
    // The front plate sits above the page, so both it and the status bar
    // and home indicator must be transparent to the pointer or the preview's
    // nav stops responding.
    const frontImg = source.slice(source.lastIndexOf('src={front}'));
    expect(frontImg).toContain('pointer-events-none');
    expect(source).toMatch(/status bar[\s\S]*pointer-events-none/);
    expect(source).toMatch(/Home indicator[\s\S]{0,400}pointer-events-none/);
  });

  test('one home indicator, in device pixels inside the scaled box', () => {
    const indicators = source.match(/rounded-full bg-black\/70/g) ?? [];
    expect(indicators).toHaveLength(1);
    expect(source).toContain('w-28');
    expect(source).toContain('bottom-2');
  });

  test('the frame and its label are not selectable', () => {
    expect(source).toContain('select-none');
  });

  test('the caller sets the width; the frame only sets the ratio', () => {
    expect(source).toContain("'relative aspect-[95.25/193.14585] select-none'");
    expect(source).toContain('className');
  });
});
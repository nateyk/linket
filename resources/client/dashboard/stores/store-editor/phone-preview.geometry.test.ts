import fs from 'node:fs';
import {describe, expect, test} from 'vitest';
import {
  frameHeightFor,
  frameWidthFor,
  PHONE_FRAME_ASPECT,
  PHONE_FRAME_ASPECT_RATIO,
  PHONE_GEOMETRY,
  scaleFor,
} from './phone-preview.constants';

const svg = fs.readFileSync(
  'resources/client/dashboard/stores/store-editor/iphone-14-pro-back.svg',
  'utf8',
);

/**
 * Collects every rect with its ancestor translate applied, so the screen
 * glass can be compared against the constants in viewBox units regardless of
 * how the artwork nests its groups. Only the transforms this file actually
 * uses are handled: `translate(x)` / `translate(x, y)`.
 */
function readRects(markup: string) {
  const rects: Array<{fill: string; x: number; y: number; w: number; h: number}> = [];
  const stack: number[][] = [];
  // Self-closing and container elements only; the file has no nested <rect>.
  const tagPattern = /<(\/?)([a-zA-Z]+)\b([^>]*?)(\/?)>/g;
  let match: RegExpExecArray | null;

  const skip = new Set([
    'defs',
    'linearGradient',
    'radialGradient',
    'stop',
    'clipPath',
    'mask',
    'title',
    'desc',
  ]);

  while ((match = tagPattern.exec(markup))) {
    const [, closing, tag, attrs, selfClosing] = match;

    if (skip.has(tag)) {
      if (!closing && !selfClosing) {
        // Jump past the element's whole subtree.
        const nested = new RegExp(`<(/?)${tag}\\b`, 'g');
        nested.lastIndex = tagPattern.lastIndex;
        let depth = 1;
        let end = markup.length;
        let step: RegExpExecArray | null = nested.exec(markup);
        while (step && depth > 0) {
          depth += step[1] ? -1 : 1;
          if (depth > 0) step = nested.exec(markup);
        }
        end = step ? nested.lastIndex : markup.length;
        tagPattern.lastIndex = end;
      }
      continue;
    }

    if (closing) {
      stack.pop();
      continue;
    }

    const translate = attrs.match(/transform="translate\(([^)]*)\)"/);
    const [tx = '0', ty = '0'] = translate
      ? translate[1].trim().split(/[,\s]+/)
      : [];
    const offset: [number, number] = [Number(tx), Number(ty)];

    if (tag === 'rect') {
      const attr = (name: string) => {
        const found = attrs.match(new RegExp(`${name}="([^"]*)"`));
        return found ? Number(found[1]) : Number.NaN;
      };
      const fill =
        attrs.match(/fill:(#[0-9a-fA-F]{3,8})/)?.[1] ??
        attrs.match(/fill="(#[0-9a-fA-F]{3,8})"/)?.[1] ??
        '';
      const offsetX = stack.reduce((sum, t) => sum + t[0], 0) + offset[0];
      const offsetY = stack.reduce((sum, t) => sum + t[1], 0) + offset[1];
      rects.push({
        fill,
        x: attr('x') + offsetX,
        y: attr('y') + offsetY,
        w: attr('width'),
        h: attr('height'),
      });
    }

    // Exactly one frame per opened element, so every close tag balances.
    if (!selfClosing && tag !== 'rect') stack.push(offset);
  }

  return rects;
}

/**
 * Reads the drawn screen glass out of the artwork so the constants cannot
 * drift away from the file they describe. The glass is the largest solid
 * black rect: the body, bezel and highlight rects are all lighter.
 */
function readScreenGlass(): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
  expect(viewBox, 'the SVG needs a viewBox').toBeTruthy();
  const [, , vbWidth, vbHeight] = viewBox!.split(/\s+/).map(Number);

  const rects = readRects(svg);

  const black = rects
    .filter(r => r.fill.toLowerCase() === '#000000')
    .sort((a, b) => b.w * b.h - a.w * a.h);
  expect(black.length, 'the artwork needs a black screen rect').toBeGreaterThan(0);

  const glass = black[0];
  const result = {
    x: glass.x,
    y: glass.y,
    width: glass.w,
    height: glass.h,
  };

  // Sanity-check the parse against the viewBox before trusting it.
  expect(result.x).toBeGreaterThan(0);
  expect(result.y).toBeGreaterThan(0);
  expect(result.x + result.width).toBeLessThan(vbWidth);
  expect(result.y + result.height).toBeLessThan(vbHeight);

  return result;
}

describe('artwork geometry', () => {
  test('the viewBox in the constants matches the SVG', () => {
    const [, , width, height] = svg
      .match(/viewBox="([^"]+)"/)![1]
      .split(/\s+/)
      .map(Number);

    expect(PHONE_GEOMETRY.viewBox.width).toBe(width);
    expect(PHONE_GEOMETRY.viewBox.height).toBe(height);
  });

  test('the screen box is the drawn glass inset by an even bezel', () => {
    const glass = readScreenGlass();
    const {viewBox, screen} = PHONE_GEOMETRY;

    const box = {
      x: (viewBox.width * screen.left) / 100,
      y: (viewBox.height * screen.top) / 100,
      width: (viewBox.width * screen.width) / 100,
      height: (viewBox.height * screen.height) / 100,
    };

    // The page must sit inside the drawn glass, not over the bezel.
    expect(box.x).toBeGreaterThan(glass.x);
    expect(box.y).toBeGreaterThan(glass.y);
    expect(box.x + box.width).toBeLessThan(glass.x + glass.width);
    expect(box.y + box.height).toBeLessThan(glass.y + glass.height);

    // And the inset has to be even, or the page sits off-centre in the
    // bezel and the gap reads as a mistake.
    const inset = {
      left: box.x - glass.x,
      right: glass.x + glass.width - (box.x + box.width),
      top: box.y - glass.y,
      bottom: glass.y + glass.height - (box.y + box.height),
    };
    expect(inset.left).toBeCloseTo(inset.right, 2);
    expect(inset.top).toBeCloseTo(inset.bottom, 2);
    // The horizontal bezel is thinner than the vertical one on this device.
    expect(inset.left).toBeLessThan(inset.top);
  });

  test('the screen box preserves the page viewport ratio', () => {
    const {viewBox, screen, viewport} = PHONE_GEOMETRY;
    const boxAspect =
      (viewBox.width * screen.width) / (viewBox.height * screen.height);
    const pageAspect = viewport.width / viewport.height;

    // A hair off is fine (the bezel is not symmetric to the pixel); a visible
    // difference would squash the page or crop it.
    expect(Math.abs(boxAspect / pageAspect - 1)).toBeLessThan(0.005);
  });
});

describe('derived helpers', () => {
  test('frame height follows the artwork ratio', () => {
    const {width, height} = PHONE_GEOMETRY.viewBox;
    expect(frameHeightFor(width)).toBeCloseTo(height, 6);
    expect(frameHeightFor(760)).toBeCloseTo((760 * height) / width, 6);
  });

  test('frame width for a height is the inverse of frame height', () => {
    const {width, height} = PHONE_GEOMETRY.viewBox;
    const h = 640;
    expect(frameWidthFor(h)).toBeCloseTo((h * width) / height, 6);
    // Round-tripping must be stable or the fit calculation can drift.
    expect(frameHeightFor(frameWidthFor(h))).toBeCloseTo(h, 6);
  });

  test('scale maps the page viewport onto the screen width', () => {
    expect(scaleFor(PHONE_GEOMETRY.viewport.width)).toBe(1);
    expect(scaleFor(0)).toBe(0);
    expect(scaleFor(196.5)).toBe(0.5);
  });

  test('the numeric aspect ratio matches the CSS one', () => {
    const {width, height} = PHONE_GEOMETRY.viewBox;
    expect(PHONE_FRAME_ASPECT).toBe(`${width} / ${height}`);
    expect(PHONE_FRAME_ASPECT_RATIO).toBeCloseTo(width / height, 12);
  });

  test('safe areas sit inside the viewport', () => {
    const {viewport, safeArea} = PHONE_GEOMETRY;
    expect(safeArea.top).toBeGreaterThan(0);
    expect(safeArea.bottom).toBeGreaterThan(0);
    expect(safeArea.top + safeArea.bottom).toBeLessThan(viewport.height);
  });
});
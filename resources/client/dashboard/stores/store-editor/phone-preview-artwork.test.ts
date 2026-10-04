import fs from 'node:fs';
import {describe, expect, test} from 'vitest';

/**
 * The artwork is committed rather than generated, so these assertions are the
 * only thing standing between a well-meaning edit and a preview that renders
 * subtly wrong. Optimised once with scripts documented in the commit; the
 * checks below pin the properties that made the optimisation safe.
 */
const DIR = 'resources/client/dashboard/stores/store-editor';
const files = {
  back: fs.readFileSync(`${DIR}/iphone-14-pro-back.svg`, 'utf8'),
  front: fs.readFileSync(`${DIR}/iphone-14-pro-front.svg`, 'utf8'),
};

const VIEWBOX = 'viewBox="0 0 95.25 193.14585"';

describe('iphone artwork', () => {
  test.each(Object.entries(files))(
    '%s shares the exact viewBox the geometry constants use',
    (_name, svg) => {
      expect(svg).toContain(VIEWBOX);
    },
  );

  test.each(Object.entries(files))('%s has no editor metadata left', (_name, svg) => {
    for (const cruft of [
      'inkscape',
      'sodipodi',
      'c2pa',
      'rdf:',
      '<!--',
      '<?xml',
      'xmlns:dc',
    ]) {
      expect(svg, `found "${cruft}"`).not.toContain(cruft);
    }
  });

  test.each(Object.entries(files))(
    '%s keeps a width/height for the browser to reserve space',
    (_name, svg) => {
      // Without an intrinsic size the <img> box is only known once decoded,
      // which is a layout shift on first paint.
      const root = svg.slice(0, svg.indexOf('>'));
      expect(root).toMatch(/width="\d+(\.\d+)?"/);
      expect(root).toMatch(/height="\d+(\.\d+)?"/);
    },
  );

  test.each(Object.entries(files))(
    '%s references every def it declares',
    (_name, svg) => {
      const declared = [
        ...svg.matchAll(
          /<(?:linearGradient|radialGradient|filter|clipPath|mask|pattern)\b[^>]*\bid="([^"]+)"/g,
        ),
      ].map(m => m[1]);
      const referenced = new Set([
        ...[...svg.matchAll(/url\(#([^)]+)\)/g)].map(m => m[1]),
        // A gradient may inherit its stops through href rather than url().
        ...[...svg.matchAll(/(?:xlink:)?href="#([^"]+)"/g)].map(m => m[1]),
      ]);

      // Unreferenced defs are dead weight; the front plate used to ship 16
      // gradients it never painted.
      const dead = declared.filter(id => !referenced.has(id));
      expect(dead, 'dead defs').toEqual([]);
    },
  );

  test('the back plate still draws the screen glass the layout sits in', () => {
    // The geometry test re-derives the screen box from this rect, so it must
    // survive optimisation as a rect with a resolvable box.
    const blacks = [...files.back.matchAll(/<rect\b[^>]*>/g)]
      .map(m => m[0])
      .filter(tag => /fill:(?:#000000|#000)\b/.test(tag));

    expect(blacks.length).toBeGreaterThan(0);
    for (const tag of blacks) {
      for (const attr of ['x', 'y', 'width', 'height']) {
        expect(tag, `missing ${attr}`).toContain(`${attr}=`);
      }
    }
  });

  test('the front plate carries only the island and camera', () => {
    // Two plates, two jobs: the front is chrome, the back is the body. If a
    // full body ever ends up here it is drawn under the page for nothing.
    expect(files.front).toContain('<rect');
    expect(files.front).toContain('<circle');
    // No screen-sized rect: the front must not paint over the page.
    const rects = [...files.front.matchAll(/<rect\b[^>]*>/g)].map(m => m[0]);
    for (const tag of rects) {
      const width = Number(tag.match(/width="([\d.]+)"/)![1]);
      expect(width, 'front plate rect is screen-sized').toBeLessThan(40);
    }
  });

  test('both plates are small enough to be worth shipping', () => {
    // A rough ceiling, not a target: these are decoration around a 393px
    // screen, and the front plate is mostly not even visible.
    expect(files.back.length).toBeLessThan(16_000);
    expect(files.front.length).toBeLessThan(6_000);
  });
});
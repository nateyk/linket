import {describe, expect, test} from 'vitest';
import {BrowserSafeFonts, normalizeFontConfig} from './browser-safe-fonts';

describe('normalizeFontConfig', () => {
  test('drops a stale google flag from a browser-safe family', () => {
    const stale = {
      ...BrowserSafeFonts[0]!,
      google: true,
      category: 'sans-serif',
    };

    expect(normalizeFontConfig(stale)).toEqual({
      family: BrowserSafeFonts[0]!.family,
    });
  });

  test('keeps google metadata for an actual Google font', () => {
    const google = {
      family: 'Roboto',
      google: true,
      category: 'sans-serif',
    };

    expect(normalizeFontConfig(google)).toEqual(google);
  });

  test('drops an explicit false google flag', () => {
    expect(
      normalizeFontConfig({
        family: 'Arial, Helvetica Neue, Helvetica, sans-serif',
        google: false,
      }),
    ).toEqual({
      family: 'Arial, Helvetica Neue, Helvetica, sans-serif',
    });
  });
});

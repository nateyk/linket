/** @vitest-environment jsdom */
import {beforeEach, describe, expect, test, vi} from 'vitest';

const {loadAsset} = vi.hoisted(() => ({
  loadAsset: vi.fn((_url: string, _options?: unknown) => Promise.resolve()),
}));

vi.mock('@ui/utils/loaders/lazy-loader', () => ({
  default: {loadAsset},
}));

import {BrowserSafeFonts} from './browser-safe-fonts';
import {loadFonts} from './load-fonts';

describe('loadFonts', () => {
  beforeEach(() => {
    loadAsset.mockClear();
  });

  test('never sends a browser-safe family to Google Fonts, even with a stale flag', async () => {
    await loadFonts([{...BrowserSafeFonts[0]!, google: true}], {
      id: 'test-fonts',
    });

    expect(loadAsset).not.toHaveBeenCalled();
  });

  test('requests only the actual Google families in a mixed list', async () => {
    await loadFonts(
      [BrowserSafeFonts[0]!, {family: 'Roboto', google: true}],
      {id: 'test-fonts', weights: [400, 700]},
    );

    expect(loadAsset).toHaveBeenCalledTimes(1);
    const url = loadAsset.mock.calls[0]![0] as string;
    expect(url).toContain('Roboto:400,700');
    expect(url).not.toContain('ui-sans-serif');
  });
});

import {describe, expect, it, vi} from 'vitest';

vi.mock('@ui/bootstrap-data/bootstrap-data-store', () => ({
  getBootstrapData: () => ({settings: {}, themes: undefined}),
}));

import {ChartColors} from '@common/charts/chart-colors';

describe('legacy chart palette fallback', () => {
  it('uses a valid Linket blue when the current bootstrap has no legacy themes', () => {
    expect(ChartColors[0]).toEqual([
      'rgb(0,73,204)',
      'rgba(0,73,204,0.2)',
    ]);
    expect(ChartColors.every(colors => colors.length === 2)).toBe(true);
  });
});

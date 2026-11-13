import {describe, expect, it} from 'vitest';
import {getHcManagerBasePath} from './hc-manager-paths';

describe('Help Center dashboard navigation', () => {
  it('keeps admin help pages under the shared admin sidebar', () => {
    expect(getHcManagerBasePath('/admin/help')).toBe('/admin/help');
    expect(getHcManagerBasePath('/admin/help/arrange')).toBe('/admin/help');
    expect(getHcManagerBasePath('/admin/help/arrange/categories/12')).toBe('/admin/help');
    expect(getHcManagerBasePath('/admin/help/articles/7/edit')).toBe('/admin/help');
  });

  it('preserves agent routes for staff without admin access', () => {
    expect(getHcManagerBasePath('/agent/hc/arrange')).toBe('/agent/hc');
    expect(getHcManagerBasePath('/agent/hc/articles/7/edit')).toBe('/agent/hc');
    expect(getHcManagerBasePath('/admin/helper')).toBe('/agent/hc');
  });
});

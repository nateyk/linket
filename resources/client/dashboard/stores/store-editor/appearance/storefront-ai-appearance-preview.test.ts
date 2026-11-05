import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, it} from 'vitest';

describe('PR-09 safe storefront preview boundary', () => {
  it('only previews server allowlisted presets and never saves or publishes', () => {
    const source = fs.readFileSync(
      path.resolve('resources/client/dashboard/stores/store-editor/appearance/storefront-ai-appearance-preview.tsx'),
      'utf8',
    );
    const appearanceTab = fs.readFileSync(
      path.resolve('resources/client/dashboard/stores/store-editor/appearance/biolink-appearance-tab.tsx'),
      'utf8',
    );
    expect(appearanceTab).toContain('<StorefrontAiAppearancePreview />');
    expect(source).toContain("'/appearance-availability'");
    expect(source).toContain("'/appearance-preview'");
    expect(source).toContain('appearanceIsDirty');
    expect(source).toContain('aria-pressed={preview?.preset === item.id}');
    expect(source).toContain('role="alert"');
    expect(source).toContain('Before and after comparison');
    expect(source).toContain('Illustrative button comparison only.');
    expect(source).toContain('requestVersion.current');
    expect(source).toContain('version === requestVersion.current');
    expect(source).not.toContain('updateAppearance(');
    expect(source).not.toContain('appearance-revision');
    expect(source).not.toMatch(/apiClient\.(post|patch|put|delete)\(/);
  });
});

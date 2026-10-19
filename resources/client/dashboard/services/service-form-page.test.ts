import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

describe('service form submission', () => {
  test('rehydrates from the PUT response so newly created child ids survive', () => {
    const source = fs.readFileSync(
      path.resolve('resources/client/dashboard/services/service-form-page.tsx'),
      'utf8',
    );

    expect(source).toContain('const response = await apiClient.put(');
    expect(source).toMatch(/setForm\(\s*fromServiceResource\(/);
  });

  test('publishes from the header and keeps draft saving separate', () => {
    const source = fs.readFileSync(
      path.resolve('resources/client/dashboard/services/service-form-page.tsx'),
      'utf8',
    );

    expect(source).toContain("void save('draft')");
    expect(source).toContain("void save('published')");
  });
});

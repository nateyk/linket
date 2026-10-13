import {adminRoutes} from '@app/admin/admin-routes';
import {AppSettingsNavConfig} from '@app/admin/admin-config';
import {describe, test, expect} from 'vitest';

const admin = adminRoutes[0] as any;
const childPaths: string[] = admin.children!.map((c: any) => c.path);

describe('admin help center and blog are top-level pages', () => {
  test('routes are mounted at the admin top level', () => {
    expect(childPaths).toContain('help');
    expect(childPaths).toContain('blog');
  });

  test('routes are no longer nested inside the settings children', () => {
    const settings = admin.children!.find(
      (c: any) => c.path === 'settings',
    ) as any;
    const settingsChildPaths = settings.children!.map((c: any) => c.path);

    expect(settingsChildPaths).not.toContain('help');
    expect(settingsChildPaths).not.toContain('blog');
  });

  test('help and blog are not tabs in the settings nav config', () => {
    const tos = AppSettingsNavConfig.map(item => item.to);
    expect(tos).not.toContain('help');
    expect(tos).not.toContain('blog');
  });
});

import {adminRoutes} from '@app/admin/admin-routes';
import {createHcManagerRoutes} from '@app/help-center/manager/hc-manager-routes';
import {AppSettingsNavConfig} from '@app/admin/admin-config';
import {describe, test, expect} from 'vitest';

const admin = adminRoutes[0] as any;
const childPaths: string[] = admin.children!.map((c: any) => c.path);

describe('admin help center and blog are top-level pages', () => {
  test('routes are mounted at the admin top level', () => {
    expect(childPaths).toContain('help');
    expect(childPaths).toContain('blog');
  });

  test('keeps help center pages in the admin shell instead of redirecting to agents', () => {
    const help = admin.children!.find((c: any) => c.path === 'help') as any;
    expect(help.children[0].element.props.to).toBe('/admin/help/arrange');
    expect(childPaths).toContain('help/arrange');
    expect(help.children.some((c: any) => c.path === 'articles/:articleId/edit')).toBe(true);

    const arrangement = admin.children!.find(
      (c: any) => c.path === 'help/arrange',
    ) as any;
    expect(arrangement.children.some((c: any) => c.path === 'categories/:categoryId')).toBe(true);
    expect(arrangement.children.some((c: any) => c.path === 'sections/:sectionId/articles/new')).toBe(true);
  });

  test('keeps agent Help Center routes available for non-admin staff', () => {
    const agentRoutes = createHcManagerRoutes('hc', '/agent/hc');
    expect(agentRoutes.map(route => route.path)).toEqual(['hc', 'hc/arrange']);
    expect((agentRoutes[0].children?.[0].element as any).props.to).toBe('/agent/hc/arrange');
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

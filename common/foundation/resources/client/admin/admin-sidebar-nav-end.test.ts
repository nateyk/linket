import {describe, expect, test} from 'vitest';
import {
  isSettingsNavOnlyAdminItem,
  shouldEndMatchSidebarItem,
} from './admin-sidebar-nav-end';

const siblings = [
  {action: '/admin/insights'},
  {action: '/admin/settings'},
  {action: '/admin/settings/hc'},
  {action: '/admin/blog'},
];

describe('isSettingsNavOnlyAdminItem', () => {
  test('keeps Livechat and AI Agent inside Settings', () => {
    expect(isSettingsNavOnlyAdminItem('/admin/settings/livechat')).toBe(true);
    expect(isSettingsNavOnlyAdminItem('/admin/settings/ai')).toBe(true);
    expect(isSettingsNavOnlyAdminItem('/admin/settings')).toBe(false);
  });
});

describe('shouldEndMatchSidebarItem', () => {
  test('keeps /admin exact-only', () => {
    expect(
      shouldEndMatchSidebarItem({action: '/admin'}, '/admin/insights', siblings),
    ).toBe(true);
  });

  test('uses end for Settings when Help center path is current', () => {
    expect(
      shouldEndMatchSidebarItem(
        {action: '/admin/settings'},
        '/admin/settings/hc',
        siblings,
      ),
    ).toBe(true);
  });

  test('does not use end for Settings on nested settings without a sibling', () => {
    expect(
      shouldEndMatchSidebarItem(
        {action: '/admin/settings'},
        '/admin/settings/general',
        siblings,
      ),
    ).toBe(false);
  });

  test('does not use end for the more-specific Help center item itself', () => {
    expect(
      shouldEndMatchSidebarItem(
        {action: '/admin/settings/hc'},
        '/admin/settings/hc',
        siblings,
      ),
    ).toBe(false);
  });

  test('does not treat unrelated prefixes as siblings', () => {
    expect(
      shouldEndMatchSidebarItem(
        {action: '/admin/settings'},
        '/admin/settings-extra',
        [{action: '/admin/settings'}, {action: '/admin/settings-extra'}],
      ),
    ).toBe(false);
  });
});

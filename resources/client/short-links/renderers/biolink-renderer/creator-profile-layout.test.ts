import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

/**
 * The mobile profile and the desktop profile are two different arrangements
 * in one file: below the `@4xl` container breakpoint the bottom nav is the
 * only way to reach Products and About, above it the storefront's tab strip
 * carries both. These read the source because the split is expressed as
 * container-query classes on the two wrappers, which no unit render of the
 * layout would exercise — the breakpoint only resolves against a real
 * container.
 */
const source = fs.readFileSync(
  path.resolve(
    'resources/client/short-links/renderers/biolink-renderer',
    'creator-profile-layout.tsx',
  ),
  'utf8',
);

function mobileProfileSection(): string {
  const start = source.indexOf("{activeTab === 'profile' && (");
  expect(start).toBeGreaterThan(-1);
  const end = source.indexOf("{hasProducts && activeTab === 'products'", start);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('mobile creator profile', () => {
  test('Profile shows the card only — no storefront tab strip', () => {
    const section = mobileProfileSection();
    expect(section).toContain('<CreatorCard');
    // The tab strip is StoreFront. Reaching it from Profile would give the
    // page two controls for the same two sections.
    expect(section).not.toContain('StoreFront');
    expect(section).not.toContain('CreatorProfileContent');
  });

  test('each section is its own conditional block, gated on the active one', () => {
    expect(source).toContain("{activeTab === 'profile' && (");
    expect(source).toContain("{hasProducts && activeTab === 'products' && (");
    expect(source).toContain("{hasAbout && activeTab === 'about' && (");
  });

  test('the storefront tab strip survives for the desktop grid', () => {
    // Desktop keeps Products | About side by side, so StoreFront still has
    // to render there; only the mobile branch lost it.
    expect(source).toContain('<StoreFront');
    const desktopBranch = source.slice(
      source.indexOf('@4xl:grid'),
      source.indexOf('@4xl:grid') + 900,
    );
    expect(desktopBranch).toContain('CreatorProfileContent');
  });

  test('the bottom nav is the only section switcher on mobile', () => {
    const nav = source.slice(source.indexOf('<BottomNavBar'));
    expect(nav).toContain('onIndexChange');
    expect(nav).toContain("setActiveTab(item.value)");
    // Switching resets the scroll so a section never opens halfway down.
    expect(nav).toContain('window.scrollTo');
  });

  test('nav only lists sections that exist, and hides when there are none', () => {
    const navItems = source.slice(
      source.indexOf('const biolinkNavItems'),
      source.indexOf('const biolinkNavItems') + 700,
    );
    expect(navItems).toContain("value: 'profile'");
    // Products and About are conditional, so a profile with neither shows
    // Profile alone rather than dead tabs.
    expect(navItems).toContain('...(hasProducts');
    expect(navItems).toContain('...(hasAbout');
    expect(source).toContain('{showNavigation && (');
  });

  test('the nav wrapper stays hidden on the desktop breakpoint', () => {
    const wrapper = source.slice(
      source.indexOf('{showNavigation && ('),
      source.indexOf('{showNavigation && (') + 200,
    );
    expect(wrapper).toContain('@4xl:hidden');
  });
});
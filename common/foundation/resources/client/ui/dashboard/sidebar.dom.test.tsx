/**
 * @vitest-environment jsdom
 */
import {render} from '@testing-library/react';
import {expect, test} from 'vitest';

import {DashboardLayout} from './dashboard-layout';
import {Sidebar} from './sidebar';

function renderSidebar(sidebarProps: {['aria-label']?: string} = {}) {
  return render(
    <DashboardLayout.Root name="test">
      <DashboardLayout.Content>
        <Sidebar.Root side="left" collapsible="icon" {...sidebarProps}>
          <a href="#one">One</a>
        </Sidebar.Root>
        <main>content</main>
      </DashboardLayout.Content>
    </DashboardLayout.Root>,
  );
}

test('sidebar root is a navigation landmark with a default label (A-10)', () => {
  renderSidebar();

  const nav = document.querySelector<HTMLElement>('[data-slot="sidebar"]');
  expect(nav).toBeTruthy();
  expect(nav!.tagName).toBe('NAV');
  expect(nav!.getAttribute('aria-label')).toBe('Main navigation');
});

test('consumers can override the sidebar landmark label (A-10)', () => {
  renderSidebar({'aria-label': 'Settings navigation'});

  const nav = document.querySelector<HTMLElement>('[data-slot="sidebar"]');
  expect(nav!.tagName).toBe('NAV');
  expect(nav!.getAttribute('aria-label')).toBe('Settings navigation');
});

test('layout shell does not clip positioned children (no overflow-hidden)', () => {
  renderSidebar();

  // The h-screen shell intentionally leaves overflow visible so sr-only
  // anchors and other positioned children inside it are never cut off;
  // the inner scroll regions own their own overflow.
  const root = document.querySelector<HTMLElement>(
    '[class*="group/dashboard-layout"]',
  );
  expect(root).toBeTruthy();
  expect(root!.className).toContain('h-screen');
  expect(root!.className).not.toContain('overflow-hidden');
});

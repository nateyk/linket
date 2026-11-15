/** @vitest-environment jsdom */

import {adminRoutes} from '@app/admin/admin-routes';
import {getVisibleSupportDestinations} from '@app/admin/support/admin-support-management-page';
import {describe, expect, it} from 'vitest';

describe('admin Support management', () => {
  it('is a child route of the native admin dashboard, with an authorization guard', () => {
    const admin = adminRoutes.find(route => route.path === 'admin');
    const support = admin?.children?.find(route => route.path === 'support');
    expect(support).toBeDefined();
    expect(typeof support?.loader).toBe('function');
    expect(typeof support?.lazy).toBe('function');
  });

  it('provides direct entry points to the actual agent inbox and ticket search', () => {
    const visible = getVisibleSupportDestinations(() => true);
    expect(visible.inbox.map(item => item.href)).toEqual([
      '/agent/conversations?viewId=all',
      '/agent/conversations?viewId=mine',
      '/agent/conversations/search',
    ]);
    expect(visible.management.map(item => item.href)).toContain('/admin/help');
    expect(visible.management.map(item => item.href)).toContain('/agent/team/members');
    expect(visible.management.map(item => item.href)).toContain('/agent/saved-replies');
    expect(visible.management.map(item => item.href)).toContain('/agent/reports');
  });

  it('never renders support actions that the user lacks permission to access', () => {
    const noPermissions = getVisibleSupportDestinations(() => false);
    expect(noPermissions.inbox).toHaveLength(0);
    expect(noPermissions.management).toHaveLength(0);

    const articleManager = getVisibleSupportDestinations(
      permission => permission === 'articles.update',
    );
    expect(articleManager.inbox).toHaveLength(0);
    expect(articleManager.management.map(item => item.href)).toEqual(['/admin/help']);

    const agent = getVisibleSupportDestinations(
      permission => permission === 'conversations.update',
    );
    expect(agent.inbox).toHaveLength(3);
    expect(agent.management.map(item => item.href)).toEqual(['/agent/saved-replies']);
  });
});

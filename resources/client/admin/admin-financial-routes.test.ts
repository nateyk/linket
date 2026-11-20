import {describe, it, expect} from 'vitest';
import {adminRoutes} from '@app/admin/admin-routes';
import {RouteObject} from 'react-router';

describe('admin financial routes and redirects', () => {
  const adminChildren = (adminRoutes.find(r => r.path === 'admin')?.children ?? []) as RouteObject[];

  it('redirects /admin/payment-activity to /admin/financial/payment-activity', async () => {
    const route = adminChildren.find(r => r.path === 'payment-activity');
    expect(route).toBeDefined();
    expect(route?.loader).toBeTypeOf('function');
    const response = await (route!.loader as any)({
      params: {},
      request: new Request('http://localhost/admin/payment-activity'),
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/admin/financial/payment-activity');
  });

  it('has a dedicated Chapa payout-account route and preserves legacy links', async () => {
    const payoutRoute = adminChildren.find(r => r.path === 'payout-accounts');
    expect(payoutRoute?.lazy).toBeTypeOf('function');

    for (const path of ['payout-acc', 'withdrawal-methods']) {
      const alias = adminChildren.find(r => r.path === path);
      expect(alias?.loader).toBeTypeOf('function');
      const response = await (alias!.loader as any)({
        params: {},
        request: new Request('http://localhost/admin/' + path),
      });
      expect(response.headers.get('Location')).toBe('/admin/payout-accounts');
    }

    const financial = adminChildren.find(r => r.path === 'financial');
    const oldRoute = (financial?.children as RouteObject[]).find(r => r.path === 'withdrawal-methods');
    const response = await (oldRoute!.loader as any)({
      params: {},
      request: new Request('http://localhost/admin/financial/withdrawal-methods'),
    });
    expect(response.headers.get('Location')).toBe('/admin/payout-accounts');
  });

  it('redirects obsolete withdrawal editor URLs to the active financial settings', async () => {
    const financialRoute = adminChildren.find(r => r.path === 'financial');
    const children = financialRoute?.children as RouteObject[];
    for (const path of ['withdrawal-methods/legacy', 'withdrawal-methods/create', 'withdrawal-methods/:methodId/edit']) {
      const oldRoute = children.find(r => r.path === path);
      expect(oldRoute?.loader).toBeTypeOf('function');
      const response = await (oldRoute!.loader as any)({
        params: {methodId: '12'},
        request: new Request('http://localhost/admin/financial/withdrawal-methods/legacy'),
      });
      expect(response.headers.get('Location')).toBe('/admin/financial/general');
      expect(oldRoute?.lazy).toBeUndefined();
    }
  });

  it('retires Verify.et-only admin pages without losing Chapa settings', async () => {
    const financialRoute = adminChildren.find(r => r.path === 'financial');
    const financialChildren = financialRoute?.children as RouteObject[];
    const legacy = [
      adminChildren.find(r => r.path === 'items/payment-methods'),
      financialChildren.find(r => r.path === 'payment-gateways'),
    ];
    for (const route of legacy) {
      expect(route?.loader).toBeTypeOf('function');
      expect(route?.lazy).toBeUndefined();
      const response = await (route!.loader as any)({
        params: {},
        request: new Request('http://localhost/admin/financial/payment-gateways'),
      });
      expect(response.headers.get('Location')).toBe('/admin/financial/general');
    }
  });

  it('registers canonical top-level Withdrawals and Review pages', () => {
    const queue = adminChildren.find(r => r.path === 'withdrawals');
    const review = adminChildren.find(r => r.path === 'withdrawals/:withdrawalId/review');
    expect(queue?.lazy).toBeTypeOf('function');
    expect(queue?.loader).toBeUndefined();
    expect(review?.lazy).toBeTypeOf('function');
    expect(review?.loader).toBeUndefined();
  });

  it('redirects historical nested Financial withdrawal links to the main admin pages', async () => {
    const financialRoute = adminChildren.find(r => r.path === 'financial');
    const children = financialRoute?.children as RouteObject[];
    const cases = [
      {path: 'withdrawals', target: '/admin/withdrawals', id: undefined},
      {path: 'withdrawals/:withdrawalId/review', target: '/admin/withdrawals/42/review', id: '42'},
    ];
    for (const item of cases) {
      const alias = children.find(r => r.path === item.path);
      expect(alias?.loader).toBeTypeOf('function');
      const response = await (alias!.loader as any)({
        params: {withdrawalId: item.id},
        request: new Request('http://localhost/admin/financial/withdrawals'),
      });
      expect(response.status).toBe(302);
      expect(response.headers.get('Location')).toBe(item.target);
    }
  });

  it('registers withdrawals, review, and payment-activity as children under financial', () => {
    const financialRoute = adminChildren.find(r => r.path === 'financial');
    expect(financialRoute).toBeDefined();
    const financialChildren = financialRoute?.children as RouteObject[];
    expect(financialChildren.some(r => r.path === 'withdrawals')).toBe(true);
    expect(financialChildren.some(r => r.path === 'withdrawals/:withdrawalId/review')).toBe(true);
    expect(financialChildren.some(r => r.path === 'payment-activity')).toBe(true);
  });
});

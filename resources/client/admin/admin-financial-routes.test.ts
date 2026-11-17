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

  it('redirects /admin/withdrawals to /admin/financial/withdrawals', async () => {
    const route = adminChildren.find(r => r.path === 'withdrawals');
    expect(route).toBeDefined();
    expect(route?.loader).toBeTypeOf('function');
    const response = await (route!.loader as any)({
      params: {},
      request: new Request('http://localhost/admin/withdrawals'),
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/admin/financial/withdrawals');
  });

  it('redirects /admin/withdrawals/:id/review to nested financial route', async () => {
    const route = adminChildren.find(r => r.path === 'withdrawals/:withdrawalId/review');
    expect(route).toBeDefined();
    expect(route?.loader).toBeTypeOf('function');
    const response = await (route!.loader as any)({
      params: {withdrawalId: '42'},
      request: new Request('http://localhost/admin/withdrawals/42/review'),
    });
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/admin/financial/withdrawals/42/review');
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

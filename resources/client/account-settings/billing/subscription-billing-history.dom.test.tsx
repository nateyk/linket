/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {afterEach, expect, it, vi} from 'vitest';
import {SubscriptionBillingHistory} from './subscription-billing-history';

const api = vi.hoisted(() => ({get: vi.fn(), post: vi.fn()}));
vi.mock('@common/http/query-client', () => ({apiClient: api}));
vi.mock('@common/http/errors/parsed-api-error', () => ({getApiErrorMessage: () => 'error'}));
vi.mock('@ui/i18n/trans', () => ({Trans: ({message, values}: {message: string; values?: Record<string, string | number>}) => Object.entries(values ?? {}).reduce((text, [key, value]) => text.replace(`:${key}`, String(value)), message)}));
vi.mock('@ui/i18n/format-money', () => ({formatMoney: (amount: number) => `${amount} ETB`}));
vi.mock('@ui/i18n/formatted-date', () => ({FormattedDate: ({date}: {date?: string | null}) => <time>{date}</time>}));
vi.mock('@shadcn/card/card', () => ({Card: {Root: 'section', Header: 'header', Title: 'h2', Description: 'p', Content: 'div', Action: 'div'}}));
vi.mock('@shadcn/badge/badge', () => ({Badge: 'span'}));
vi.mock('@shadcn/button/button', () => ({Button: ({children, onClick, disabled}: {children?: any; onClick?: () => void; disabled?: boolean}) => <button disabled={disabled} onClick={onClick}>{children}</button>}));
vi.mock('@shadcn/skeleton/skeleton', () => ({Skeleton: 'span'}));
vi.mock('react-router', () => ({
  Link: ({
    to,
    children,
  }: {
    to: string;
    children: React.ReactNode;
  }) => <a href={to}>{children}</a>,
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('renders creator-owned Pro payment amount, date, reference and status', async () => {
  api.get.mockResolvedValue({data: {
    pro_plan: {monthly_price_cents: 50000, currency: 'ETB'},
    pro_subscription: {status: 'active', renews_at: '2026-11-29T00:00:00Z', can_renew: true, pending_payment: {status: 'pending_payment', amount_cents: 50000}, payments: [
      {payment_id: 'mine', amount_cents: 50000, currency: 'ETB', status: 'pending_payment', transaction_reference: 'CREATOR-REF', created_at: '2026-10-29T00:00:00Z'},
      {payment_id: 'pending', amount_cents: 50000, currency: 'ETB', status: 'pending_payment', transaction_reference: 'PENDING-REF', created_at: '2026-10-28T00:00:00Z'},
      {payment_id: 'paid', amount_cents: 50000, currency: 'ETB', status: 'paid', transaction_reference: 'PAID-REF', paid_at: '2026-10-27T00:00:00Z'},
      {payment_id: 'failed', amount_cents: 50000, currency: 'ETB', status: 'failed', transaction_reference: 'FAILED-REF', created_at: '2026-10-26T00:00:00Z'},
    ]},
    invoices: {data: [{uuid: 'invoice-1', invoice_number: 'CM-202610-1', commission_fee_cents: 2000, status: 'paid', sales_count: 2}]},
  }});
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  render(<QueryClientProvider client={client}><SubscriptionBillingHistory /></QueryClientProvider>);

  expect(await screen.findByText(/CREATOR-REF/)).toBeTruthy();
  expect(screen.getAllByText('Pending payment').length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText('Paid')).toBeTruthy();
  expect(screen.getByText('Failed')).toBeTruthy();
  expect(screen.getByText('Monthly price')).toBeTruthy();
  expect(screen.getByText('Pending payment')).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Renew Pro'})).toBeTruthy();
  expect(screen.queryByRole('link', {name: 'Download receipt'})).toBeNull();
  expect(api.get).toHaveBeenCalledWith('/api/v1/billing/chapa/history');
  expect(screen.getAllByText('50000 ETB').length).toBeGreaterThanOrEqual(4);
  expect(screen.getByText('2026-10-29T00:00:00Z')).toBeTruthy();
  expect(screen.getByText('Recent Pro payments')).toBeTruthy();
  expect(screen.getByRole('link', {name: 'View Pro'})).toBeTruthy();
  expect(screen.queryByText('Legacy billing')).toBeNull();
  expect(screen.queryByText('CM-202610-1')).toBeNull();
});

it('starts a Chapa checkout when Pro upgrades use Chapa', async () => {
  const assign = vi.fn();
  vi.stubGlobal('location', {...window.location, assign});
  api.get.mockResolvedValue({data: {
    subscription_gateway: 'chapa',
    pro_plan: {monthly_price_cents: 50000, currency: 'ETB', product_id: 4, price_id: 9},
    pro_subscription: {status: 'inactive', can_renew: true, payments: []},
  }});
  api.post.mockResolvedValue({data: {checkout_url: 'https://checkout.chapa.global/CHPRO1'}});
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  render(<QueryClientProvider client={client}><SubscriptionBillingHistory /></QueryClientProvider>);
  expect(await screen.findByText('Upgrade or renew Pro with Chapa.')).toBeTruthy();
  await userEvent.click(await screen.findByRole('button', {name: 'Upgrade to Pro'}));
  expect(api.post).toHaveBeenCalledWith('/api/v1/billing/chapa/checkout', {product_id: 4, price_id: 9});
  expect(assign).toHaveBeenCalledWith('https://checkout.chapa.global/CHPRO1');
  expect(screen.queryByText('Pro payment reference')).toBeNull();
});

it('renews with Chapa when the gateway preference is omitted', async () => {
  const assign = vi.fn();
  vi.stubGlobal('location', {...window.location, assign});
  api.get.mockResolvedValue({data: {
    pro_plan: {monthly_price_cents: 50000, currency: 'ETB', product_id: 4, price_id: 9},
    pro_subscription: {status: 'past_due', renews_at: '2026-10-20T00:00:00Z', can_renew: true, payments: []},
  }});
  api.post.mockResolvedValue({data: {checkout_url: 'https://checkout.chapa.global/RENEW1'}});
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  render(<QueryClientProvider client={client}><SubscriptionBillingHistory /></QueryClientProvider>);
  await screen.findByRole('button', {name: 'Renew Pro'});
  await userEvent.click(screen.getByRole('button', {name: 'Renew Pro'}));
  expect(api.post).toHaveBeenCalledWith('/api/v1/billing/chapa/checkout', {product_id: 4, price_id: 9});
  expect(assign).toHaveBeenCalledWith('https://checkout.chapa.global/RENEW1');
  expect(screen.queryByText('Pro payment reference')).toBeNull();
});

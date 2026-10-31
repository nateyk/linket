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
vi.mock('@shadcn/card/card', () => ({Card: {Root: 'section', Header: 'header', Title: 'h2', Description: 'p', Content: 'div'}}));
vi.mock('@shadcn/badge/badge', () => ({Badge: 'span'}));
vi.mock('@shadcn/button/button', () => ({Button: ({children, onClick, disabled}: {children?: any; onClick?: () => void; disabled?: boolean}) => <button disabled={disabled} onClick={onClick}>{children}</button>}));
vi.mock('@shadcn/skeleton/skeleton', () => ({Skeleton: 'span'}));
vi.mock('react-router', () => ({Link: 'a'}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('renders creator-owned Pro payment amount, date, reference and status', async () => {
  api.get.mockResolvedValue({data: {
    pro_plan: {monthly_price_cents: 50000, currency: 'ETB'},
    pro_subscription: {status: 'active', renews_at: '2026-11-29T00:00:00Z', can_renew: true, pending_payment: {status: 'pending_payment', amount_cents: 50000}, payments: [
      {payment_id: 'mine', amount_cents: 50000, currency: 'ETB', status: 'manual_review', transaction_reference: 'CREATOR-REF', created_at: '2026-10-29T00:00:00Z'},
      {payment_id: 'pending', amount_cents: 50000, currency: 'ETB', status: 'pending_verification', transaction_reference: 'PENDING-REF', created_at: '2026-10-28T00:00:00Z'},
      {payment_id: 'paid', amount_cents: 50000, currency: 'ETB', status: 'paid', transaction_reference: 'PAID-REF', paid_at: '2026-10-27T00:00:00Z', receipt_number: 'LINKET-RECEIPT-1', receipt_url: '/api/v1/billing/direct/pro/paid/receipt'},
      {payment_id: 'rejected', amount_cents: 50000, currency: 'ETB', status: 'rejected', transaction_reference: 'REJECTED-REF', created_at: '2026-10-26T00:00:00Z'},
    ]},
    invoices: {data: [{uuid: 'invoice-1', invoice_number: 'CM-202610-1', commission_fee_cents: 2000, status: 'paid', sales_count: 2}]},
  }});
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  render(<QueryClientProvider client={client}><SubscriptionBillingHistory /></QueryClientProvider>);

  expect(await screen.findByText(/CREATOR-REF/)).toBeTruthy();
  expect(screen.getByText('Manual review')).toBeTruthy();
  expect(screen.getByText('Pending verification')).toBeTruthy();
  expect(screen.getByText('Paid')).toBeTruthy();
  expect(screen.getByText('Rejected')).toBeTruthy();
  expect(screen.getByText(/Renewal price: 50000 ETB/)).toBeTruthy();
  expect(screen.getByText(/Payment status: pending_payment/)).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Renew Pro'})).toBeTruthy();
  expect(screen.getByRole('link', {name: 'Download payment receipt'}).getAttribute('href')).toBe('/api/v1/billing/direct/pro/paid/receipt');
  expect(screen.getAllByText('50000 ETB').length).toBeGreaterThanOrEqual(4);
  expect(screen.getByText('2026-10-29T00:00:00Z')).toBeTruthy();
  expect(screen.getByText('CM-202610-1')).toBeTruthy();
});

it('initiates renewal through the existing Verify.et billing endpoint', async () => {
  api.get.mockResolvedValue({data: {
    pro_plan: {monthly_price_cents: 50000, currency: 'ETB'},
    pro_subscription: {status: 'past_due', renews_at: '2026-10-20T00:00:00Z', can_renew: true, payments: []},
    invoices: {data: []},
  }});
  api.post.mockResolvedValue({data: {payment_id: 'renew-1', amount_cents: 50000, currency: 'ETB'}});
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  render(<QueryClientProvider client={client}><SubscriptionBillingHistory /></QueryClientProvider>);
  await screen.findByRole('button', {name: 'Renew Pro'});
  await userEvent.click(screen.getByRole('button', {name: 'Renew Pro'}));
  expect(api.post).toHaveBeenCalledWith('/api/v1/billing/direct/pro');
  expect(await screen.findByText(/Renewal invoice ready for 50000 ETB/)).toBeTruthy();
});

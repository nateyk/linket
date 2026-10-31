/** @vitest-environment jsdom */
import {cleanup, render, screen, waitFor} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {MemoryRouter} from 'react-router';
import {DirectPaymentModal, type DirectCheckout} from './direct-payment-modal';

const api = vi.hoisted(() => ({get: vi.fn(), post: vi.fn()}));
vi.mock('@common/http/query-client', () => ({apiClient: api}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => message,
}));
vi.mock('@ui/i18n/format-money', () => ({
  formatMoney: (amount: number, currency: string) => `${amount} ${currency}`,
}));
vi.mock('@shadcn/badge/badge', () => ({Badge: ({children}: {children: React.ReactNode}) => <span>{children}</span>}));
vi.mock('@shadcn/button/button', () => ({
  Button: ({children, ...props}: React.ButtonHTMLAttributes<HTMLButtonElement> & {variant?: string; size?: string}) => (
    <button type="button" {...props}>{children}</button>
  ),
}));
vi.mock('@shadcn/spinner/spinner', () => ({Spinner: () => <span>loading</span>}));
vi.mock('@shadcn/forms/field', () => ({
  Field: {
    Root: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    Label: ({children}: {children: React.ReactNode}) => <label>{children}</label>,
    Description: ({children}: {children: React.ReactNode}) => <p>{children}</p>,
  },
}));
vi.mock('@shadcn/forms/input/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));
vi.mock('@shadcn/dialog/dialog', () => ({
  Dialog: {
    Root: ({children, open}: {children: React.ReactNode; open: boolean}) => open ? <div>{children}</div> : null,
    Portal: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    Backdrop: () => null,
    Content: ({children, className}: {children: React.ReactNode; className?: string}) => (
      <div data-testid="payment-dialog" className={className}>{children}</div>
    ),
    Header: ({children}: {children: React.ReactNode}) => <header>{children}</header>,
    Title: ({children}: {children: React.ReactNode}) => <h2>{children}</h2>,
    Description: ({children}: {children: React.ReactNode}) => <p>{children}</p>,
    Body: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    Footer: ({children}: {children: React.ReactNode}) => <footer>{children}</footer>,
  },
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  document.documentElement.style.width = '';
});

const checkout: DirectCheckout = {
  order_id: 'order-1',
  access_token: 'token',
  status_endpoint: '/api/v1/public/direct-orders/order-1',
  reference_endpoint: '/api/v1/public/direct-orders/order-1/reference',
  instructions_endpoint: '/api/v1/public/direct-orders/order-1/payment-instructions',
  status: 'pending_payment',
};

it('renders pending, verifying, manual review, rejected and paid states clearly at 390px', async () => {
  Object.defineProperty(window, 'innerWidth', {configurable: true, value: 390});
  document.documentElement.style.width = '390px';

  api.get.mockResolvedValue({
    data: {
      data: {
        provider: 'cbe',
        account_number: '1000123456789',
        account_name: 'Abebe Kebede',
        amount_cents: 10000,
        currency: 'ETB',
      },
    },
  });

  const {rerender} = render(
    <MemoryRouter>
      <DirectPaymentModal checkout={checkout} onClose={() => undefined} />
    </MemoryRouter>,
  );

  expect(await screen.findByText('Pending payment')).toBeTruthy();
  expect(screen.getByTestId('payment-dialog').className).toContain('w-[calc(100vw-1.5rem)]');
  expect(document.documentElement.style.width).toBe('390px');

  for (const [status, label] of [
    ['verifying', 'Verifying'],
    ['manual_review', 'Manual review'],
    ['failed_verification', 'Rejected'],
  ] as const) {
    rerender(
      <MemoryRouter>
        <DirectPaymentModal checkout={{...checkout, status}} onClose={() => undefined} />
      </MemoryRouter>,
    );
    expect(await screen.findByText(label)).toBeTruthy();
  }

  api.get.mockResolvedValueOnce({
    data: {
      data: {
        status: 'paid',
        downloads: [{name: 'guide.pdf', remaining_downloads: 3, url: '/storefront/downloads/abc'}],
      },
    },
  });

  rerender(
    <MemoryRouter>
      <DirectPaymentModal checkout={{...checkout, status: 'paid'}} onClose={() => undefined} />
    </MemoryRouter>,
  );

  await waitFor(() => {
    expect(screen.getByText('Paid')).toBeTruthy();
  });
  expect(await screen.findByText('Payment confirmed. Your purchased files are ready to download.')).toBeTruthy();
  expect(screen.getByText('guide.pdf')).toBeTruthy();
  expect(screen.getByRole('link', {name: /Open My Purchases|My Purchases/})).toBeTruthy();
});

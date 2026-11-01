/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {Component} from './direct-billing-page';

const api = vi.hoisted(() => ({get: vi.fn(), post: vi.fn()}));
vi.mock('@common/http/query-client', () => ({apiClient: api}));
vi.mock('@common/http/errors/parsed-api-error', () => ({
  getApiErrorMessage: () => 'Unable to load orders',
}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message, values}: {message: string; values?: Record<string, string | number>}) =>
    Object.entries(values ?? {}).reduce((text, [key, value]) => text.replace(`:${key}`, String(value)), message),
}));
vi.mock('@ui/i18n/format-money', () => ({
  formatMoney: (amount: number) => String(amount),
}));
vi.mock('@ui/i18n/formatted-currency', () => ({
  FormattedCurrency: ({
    valueInCents,
    currency,
  }: {
    valueInCents?: number;
    currency: string;
  }) => <span>{`${valueInCents ?? 0} ${currency}`}</span>,
}));
vi.mock('@ui/i18n/formatted-date', () => ({
  FormattedDate: ({date}: {date?: string | null}) => (
    <span>{date ?? ''}</span>
  ),
}));
vi.mock('react-router', () => ({Link: 'a', useSearchParams: () => [new URLSearchParams(window.location.search)]}));
vi.mock('@common/ui/dashboard/dashboard-layout', () => ({
  DashboardLayout: {
    MainSection: 'main',
    SectionHeader: 'header',
    SidebarToggle: 'span',
    SectionTitle: 'h1',
    SectionContent: 'section',
  },
}));
vi.mock('@shadcn/card/card', () => ({
  Card: {
    Root: ({size: _size, ...props}: React.ComponentProps<'div'> & {size?: string}) => <div {...props} />,
    Header: 'div',
    Title: 'h2',
    Content: 'div',
    Description: 'p',
    Footer: 'footer',
  },
}));
vi.mock('@shadcn/badge/badge', () => ({
  Badge: ({variant: _variant, className, ...props}: React.ComponentProps<'span'> & {variant?: string}) => (
    <span className={className} {...props} />
  ),
}));
vi.mock('@shadcn/button/button', () => ({
  Button: ({
    variant: _variant,
    size: _size,
    color: _color,
    ...props
  }: React.ComponentProps<'button'> & {
    variant?: string;
    size?: string;
    color?: string;
  }) => <button {...props} />,
}));
vi.mock('@shadcn/skeleton/skeleton', () => ({
  Skeleton: () => <span data-testid="skeleton" />,
}));
vi.mock('@shadcn/table/table', () => ({
  Table: {
    Root: 'table',
    Header: 'thead',
    Body: 'tbody',
    Row: 'tr',
    Head: 'th',
    Cell: 'td',
  },
}));
vi.mock('@shadcn/empty/empty', () => ({
  Empty: {
    Root: 'div',
    Header: 'div',
    Media: 'div',
    Title: 'p',
    Description: 'p',
  },
}));
vi.mock('@shadcn/dialog/dialog', () => ({
  Dialog: {
    Root: ({open, children}: {open: boolean; children: React.ReactNode}) =>
      open ? <>{children}</> : null,
    Portal: ({children}: {children: React.ReactNode}) => <>{children}</>,
    Backdrop: () => null,
    Content: 'div',
    Header: 'header',
    Title: 'h2',
    Description: 'p',
    Body: 'div',
    Footer: 'footer',
    CloseButton: 'button',
  },
}));
vi.mock('@shadcn/forms/input/input', () => ({
  Input: ({
    bindToHookForm: _ignored,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement> & {
    bindToHookForm?: boolean;
  }) => <input {...props} />,
}));
vi.mock('@shadcn/popover/popover', () => ({
  Popover: {
    Root: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    Trigger: ({render, children}: {render?: React.ReactNode; children?: React.ReactNode}) => <>{render ?? children}</>,
    Portal: ({children}: {children: React.ReactNode}) => <>{children}</>,
    Content: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    Header: 'div',
    Title: 'h3',
  },
}));

vi.mock('@shadcn/forms/select/select', () => ({
  Select: {
    Root: ({
      children,
      value,
      onValueChange,
    }: {
      children: React.ReactNode;
      value: string;
      onValueChange: (value: string) => void;
    }) => (
      <select
        value={value}
        aria-label="Status"
        onChange={event => onValueChange(event.target.value)}
      >
        {children}
      </select>
    ),
    Trigger: () => null,
    Value: () => null,
    Content: ({children}: {children: React.ReactNode}) => <>{children}</>,
    Group: ({children}: {children: React.ReactNode}) => <>{children}</>,
    Item: ({
      children,
      value,
    }: {
      children: React.ReactNode;
      value: string;
    }) => <option value={value}>{children}</option>,
  },
}));

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
  vi.clearAllMocks();
});

it('applies redirected order filters to the controls and request', async () => {
  window.history.replaceState({}, '', '/dashboard/orders?status=paid&search=Workbook&from=2026-10-01&to=2026-10-29&page=2');
  mockApi({orders: [baseOrder], lastPage: 3, total: 30});
  render(<Component />);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith(
    '/api/v1/storefront/direct-orders',
    expect.objectContaining({params: expect.objectContaining({status: 'paid', search: 'Workbook', from: '2026-10-01', to: '2026-10-29', page: 2})}),
  ));
  expect((screen.getByLabelText('Search orders') as HTMLInputElement).value).toBe('Workbook');
  expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('paid');
  expect((screen.getByLabelText('From date') as HTMLInputElement).value).toBe('2026-10-01');
});

const summary = {
  verified_sales_count: 2,
  verified_revenue_cents: 25000,
  pending_count: 1,
  manual_review_count: 1,
  rejected_count: 1,
  status_counts: {paid: 2, pending_payment: 1, manual_review: 1, failed_verification: 1},
  currency: 'ETB',
};

const billing = {
  pro_plan: {monthly_price_cents: 70000, currency: 'ETB'},
  pro_subscription: {status: 'inactive', pending_payment: null, payments: [{payment_id: 'pro-payment-1', amount_cents: 70000, currency: 'ETB', status: 'manual_review', transaction_reference: 'PRO-REF-1', provider: 'cbe', created_at: '2026-10-29T10:00:00Z'}]},
  verification_allowance: {
    consumed: 10,
    reserved: 0,
    remaining: 0,
    limit: 10,
    is_pro: false,
    can_start_checkout: false,
  },
  estimated_commission: {gross_sales_cents: 0, fee_cents: 0},
  invoices: {data: []},
  corporate_account: {provider: 'cbe', account_number: null},
  legacy_access: false,
};

function mockApi({
  orders = [],
  transactions = [],
  manualOrders = [],
  detail,
  lastPage = 1,
  total = orders.length,
  orderError = false,
}: {
  orders?: Array<Record<string, unknown>>;
  transactions?: Array<Record<string, unknown>>;
  manualOrders?: Array<Record<string, unknown>>;
  detail?: Record<string, unknown>;
  lastPage?: number;
  total?: number;
  orderError?: boolean;
} = {}) {
  api.get.mockImplementation(
    (url: string, options?: {params?: Record<string, unknown>}) => {
      if (url === '/api/v1/billing/direct') {
        return Promise.resolve({data: billing});
      }
      if (url === '/api/v1/storefront/payment-methods') {
        return Promise.resolve({data: {data: [], available_methods: []}});
      }
      if (url === '/api/v1/storefront/direct-orders/transactions') {
        return Promise.resolve({
          data: {
            data: {data: transactions, current_page: 1, last_page: 1, total: transactions.length},
          },
        });
      }
      if (url.startsWith('/api/v1/storefront/direct-orders/')) {
        return detail
          ? Promise.resolve({data: {data: detail}})
          : Promise.reject(new Error('not found'));
      }
      if (url === '/api/v1/storefront/direct-orders') {
        if (orderError) return Promise.reject(new Error('failure'));
        const status = options?.params?.status;
        const data = status === 'manual_review' ? manualOrders : orders;
        return Promise.resolve({
          data: {
            data: {
              data,
              current_page: Number(options?.params?.page ?? 1),
              last_page: lastPage,
              total,
            },
            summary,
          },
        });
      }
      return Promise.reject(new Error(`Unexpected request: ${url}`));
    },
  );
}

const baseOrder = {
  uuid: 'order-1',
  status: 'paid',
  buyer_name: 'Buyer One',
  transaction_reference: 'REF-ONE',
  gross_amount_cents: 10000,
  currency: 'ETB',
  payment_method: 'cbe',
  account_ending: '6789',
  created_at: '2026-10-29T10:00:00Z',
  product: {id: 1, title: 'Workbook', status: 'approved'},
};

it('shows summary and orders, and sends status, search and page filters to the server', async () => {
  mockApi({orders: [baseOrder], lastPage: 2, total: 30});
  render(<Component />);

  expect(await screen.findByText('Workbook')).toBeTruthy();
  expect(screen.getByText('25000 ETB')).toBeTruthy();
  expect(screen.getByText('Verified sales')).toBeTruthy();

  fireEvent.change(screen.getByLabelText('Status'), {
    target: {value: 'manual_review'},
  });
  await waitFor(() =>
    expect(api.get).toHaveBeenCalledWith(
      '/api/v1/storefront/direct-orders',
      expect.objectContaining({
        params: expect.objectContaining({status: 'manual_review'}),
      }),
    ),
  );

  fireEvent.click(screen.getByRole('button', {name: 'Next'}));
  await waitFor(() =>
    expect(api.get).toHaveBeenCalledWith(
      '/api/v1/storefront/direct-orders',
      expect.objectContaining({
        params: expect.objectContaining({page: 2}),
      }),
    ),
  );

  fireEvent.change(screen.getByLabelText('Search orders'), {
    target: {value: 'REF-ONE'},
  });
  await waitFor(
    () =>
      expect(api.get).toHaveBeenCalledWith(
        '/api/v1/storefront/direct-orders',
        expect.objectContaining({
          params: expect.objectContaining({search: 'REF-ONE'}),
        }),
      ),
    {timeout: 2000},
  );

  fireEvent.change(screen.getByLabelText('From date'), {
    target: {value: '2026-10-01'},
  });
  await waitFor(() =>
    expect(api.get).toHaveBeenCalledWith(
      '/api/v1/storefront/direct-orders',
      expect.objectContaining({
        params: expect.objectContaining({from: '2026-10-01'}),
      }),
    ),
  );
});

it('opens the read-only order detail with masked account and delivery state', async () => {
  mockApi({
    orders: [{...baseOrder, status: 'manual_review'}],
    detail: {
      ...baseOrder,
      status: 'manual_review',
      buyer_email: 'buyer@example.test',
      platform_fee_cents: 500,
      creator_earnings_cents: 9500,
      verification: {
        status: 'manual_review',
        provider: 'cbe',
        amount_cents: 10000,
        currency: 'ETB',
        attempts: 2,
        error_code: 'receipt_mismatch',
        history: [
          {
            reference: 'REF-ONE',
            status: 'manual_review',
            attempt: 2,
            created_at: '2026-10-29T10:00:00Z',
          },
        ],
      },
      delivery: {
        status: 'pending',
        entitlements_count: 1,
        downloaded_count: 0,
        download_limit: 10,
        files: [
          {
            name: 'workbook.pdf',
            download_count: 0,
            download_limit: 10,
          },
        ],
      },
      manual_review: {
        reason_code: 'receipt_mismatch',
        submitted_at: '2026-10-29T10:00:00Z',
      },
    },
  });
  render(<Component />);

  fireEvent.click(await screen.findByRole('button', {name: 'View details'}));

  expect(await screen.findByText('Order details')).toBeTruthy();
  expect(screen.getAllByText('REF-ONE').length).toBeGreaterThan(0);
  expect(screen.getAllByText('•••• 6789')).toHaveLength(2);
  expect(screen.getByText('buyer@example.test', {exact: false})).toBeTruthy();
  expect(screen.getByText('Manual review is read-only')).toBeTruthy();
  expect(screen.getByText('workbook.pdf')).toBeTruthy();
  expect(screen.queryByRole('button', {name: /mark.*paid/i})).toBeNull();
  expect(api.get).toHaveBeenCalledWith(
    '/api/v1/storefront/direct-orders/order-1',
  );
});

for (const [status, label] of [
  ['paid', 'Paid — delivery unconfirmed'],
  ['access_granted', 'Access granted'],
  ['downloaded', 'Downloaded'],
  ['unknown', 'Unknown'],
] as const) {
  it(`shows ${label} when delivery evidence is ${status}`, async () => {
    mockApi({orders: [baseOrder], detail: {...baseOrder, delivery: {
      status, entitlements_count: 0, downloaded_count: 0, download_limit: 0, files: [],
    }}});
    render(<Component />);
    fireEvent.click(await screen.findByRole('button', {name: 'View details'}));
    expect(await screen.findByText(label)).toBeTruthy();
    expect(screen.queryByText('Delivered')).toBeNull();
  });
}

it('loads transactions and manual review in separate tabs', async () => {
  mockApi({
    orders: [baseOrder],
    transactions: [
      {
        id: 9,
        reference: 'TX-REF',
        status: 'success',
        provider: 'cbe',
        amount_cents: 10000,
        currency: 'ETB',
        attempt: 1,
        created_at: '2026-10-29T10:00:00Z',
        order_uuid: 'order-1',
        order_status: 'paid',
        product_title: 'Workbook',
        buyer_name: 'Buyer One',
      },
    ],
    manualOrders: [{...baseOrder, uuid: 'order-2', status: 'manual_review'}],
  });
  render(<Component />);
  await screen.findByText('Workbook');

  fireEvent.click(screen.getByRole('tab', {name: 'Transactions'}));
  expect(await screen.findByText('TX-REF')).toBeTruthy();
  expect(api.get).toHaveBeenCalledWith(
    '/api/v1/storefront/direct-orders/transactions',
    expect.any(Object),
  );

  fireEvent.click(screen.getByRole('tab', {name: /Manual review/}));
  await waitFor(() =>
    expect(api.get).toHaveBeenCalledWith(
      '/api/v1/storefront/direct-orders',
      expect.objectContaining({
        params: expect.objectContaining({status: 'manual_review'}),
      }),
    ),
  );
  expect(
    await screen.findByText(
      'These payments could not be verified automatically. Review is read-only and Linket support resolves them. You cannot mark an order as paid.',
    ),
  ).toBeTruthy();

  expect(screen.queryByRole('tab', {name: 'Billing'})).toBeNull();
});

it('surfaces order loading errors', async () => {
  mockApi({orderError: true});
  render(<Component />);

  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toContain('Unable to load orders');
});

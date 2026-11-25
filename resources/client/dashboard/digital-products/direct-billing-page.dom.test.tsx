/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {Component} from './direct-billing-page';

const api = vi.hoisted(() => ({get: vi.fn(), post: vi.fn()}));
vi.mock('@common/http/query-client', () => ({apiClient: api}));
vi.mock('@common/http/errors/parsed-api-error', () => ({
  getApiErrorMessage: () => 'Unable to load orders',
}));
vi.mock('@ui/i18n/use-trans', () => ({
  useTrans: () => ({
    trans: ({message}: {message: string}) => message,
  }),
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
vi.mock('@ui/i18n/formatted-relative-time', () => ({
  FormattedRelativeTime: ({date}: {date?: string | null}) => (
    <span>{date ?? ''}</span>
  ),
}));
vi.mock('@shadcn/avatar/avatar', () => ({
  Avatar: Object.assign(
    ({children}: {children?: React.ReactNode}) => <span>{children}</span>,
    {
      Fallback: ({children}: {children?: React.ReactNode}) => <span>{children}</span>,
      initials: (value?: string | null) => value?.slice(0, 1) ?? '',
    },
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
    Action: 'div',
  },
}));
vi.mock('@shadcn/item/item', () => ({
  Item: {
    Root: ({
      render: _render,
      variant: _variant,
      size: _size,
      ...props
    }: React.ComponentProps<'div'> & {
      render?: React.ReactNode;
      variant?: string;
      size?: string;
    }) => <div {...props} />,
    Media: 'div',
    Content: 'div',
    Row: 'div',
    Title: 'div',
    Description: 'p',
    Actions: 'div',
    Group: 'div',
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
vi.mock('@shadcn/tooltip/tooltip', () => ({
  Tooltip: Object.assign(
    ({children}: {children?: React.ReactNode}) => <>{children}</>,
    {
      Provider: ({children}: {children?: React.ReactNode}) => <>{children}</>,
      Root: ({children}: {children?: React.ReactNode}) => <>{children}</>,
      Trigger: ({render}: {render?: React.ReactNode}) => <>{render}</>,
      Content: () => null,
    },
  ),
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
      name,
    }: {
      children: React.ReactNode;
      value: string;
      onValueChange: (value: string) => void;
      name?: string;
    }) => (
      <select
        value={value}
        name={name}
        aria-label={name === 'orders-gateway' ? 'Payment source' : name?.includes('per-page') ? 'Rows per page' : 'Status'}
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

it('renders readable mobile order cards without desktop table or single-page navigation', async () => {
  const originalMatchMedia = window.matchMedia;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: query === '(max-width: 768px)',
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  });

  try {
    mockApi({orders: [baseOrder], lastPage: 1, total: 1});
    render(<Component />);

    const list = await screen.findByRole('list', {name: 'Orders'});
    expect(list.querySelectorAll('[role="listitem"]')).toHaveLength(1);
    expect(screen.queryByRole('table', {name: 'Orders'})).toBeNull();
    expect(screen.getByRole('button', {name: 'View details'})).toBeTruthy();
    expect(screen.queryByRole('navigation', {name: 'Pagination'})).toBeNull();
    expect(screen.getAllByText('Workbook').length).toBeGreaterThan(0);
  } finally {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
  }
});

it('applies redirected order filters to the controls and request', async () => {
  window.history.replaceState({}, '', '/dashboard/orders?status=paid&search=Workbook&from=2026-10-01&to=2026-10-29&page=2&per_page=25');
  mockApi({orders: [baseOrder], lastPage: 3, total: 30});
  render(<Component />);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith(
    '/api/v1/storefront/direct-orders',
    expect.objectContaining({params: expect.objectContaining({status: 'paid', search: 'Workbook', from: '2026-10-01', to: '2026-10-29', page: 2, per_page: 25})}),
  ));
  expect((screen.getByLabelText('Search orders') as HTMLInputElement).value).toBe('Workbook');
  expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('paid');
  expect((screen.getByLabelText('From date') as HTMLInputElement).value).toBe('2026-10-01');
});

const summary = {
  verified_sales_count: 2,
  verified_revenue_cents: 25000,
  net_sales_cents: 25000,
  paid_orders_count: 2,
  gross_profit_cents: 20000,
  gross_profit_margin_percent: 80,
  average_order_cents: 12500,
  creator_earnings_cents: 20000,
  platform_fee_cents: 5000,
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
  payment_gateway: 'chapa',
  payment_method: 'chapa',
  account_ending: null,
  created_at: '2026-10-29T10:00:00Z',
  product: {id: 1, title: 'Workbook', status: 'approved'},
};

it('shows summary and orders, and sends status, search and page filters to the server', async () => {
  mockApi({orders: [baseOrder], lastPage: 2, total: 30});
  render(<Component />);

  expect((await screen.findAllByText('Workbook')).length).toBeGreaterThan(0);
  expect(screen.getAllByText('25000 ETB').length).toBeGreaterThan(0);
  expect(screen.getByText('Net sales')).toBeTruthy();
  expect(screen.getAllByText('Orders').length).toBeGreaterThan(0);
  expect(screen.getByText('Gross profit · 80.0%')).toBeTruthy();
  expect(screen.getByText('Average order')).toBeTruthy();
  expect(screen.getByText('12500 ETB')).toBeTruthy();
  expect(screen.queryByText('Chapa payments only · lifetime')).toBeNull();
  expect(screen.queryByText('Pending & Review')).toBeNull();
  expect(screen.queryByRole('tab', {name: 'Transactions'})).toBeNull();
  expect(screen.queryByRole('tab', {name: /Manual review/})).toBeNull();
  expect(screen.queryByText('After platform fees · before product costs')).toBeNull();
  expect(screen.queryByRole('columnheader', {name: 'Payment method'})).toBeNull();
  expect(screen.getByRole('table', {name: 'Orders'})).toBeTruthy();
  expect(screen.getByText('Orders and payment status. Only paid orders count as sales.')).toBeTruthy();

  expect(screen.queryByLabelText('Payment source')).toBeNull();
  fireEvent.change(screen.getByLabelText('Status'), {
    target: {value: 'paid'},
  });
  await waitFor(() =>
    expect(api.get).toHaveBeenCalledWith(
      '/api/v1/storefront/direct-orders',
      expect.objectContaining({
        params: expect.objectContaining({status: 'paid', gateway: 'chapa'}),
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

it('changes rows per page with server-backed pagination and resets to page one', async () => {
  mockApi({orders: [baseOrder], lastPage: 4, total: 60});
  render(<Component />);

  await screen.findAllByText('Workbook');

  const rowsPerPage = screen.getByLabelText('Rows per page') as HTMLSelectElement;
  expect(rowsPerPage.value).toBe('15');

  fireEvent.change(rowsPerPage, {target: {value: '25'}});

  await waitFor(() =>
    expect(api.get).toHaveBeenCalledWith(
      '/api/v1/storefront/direct-orders',
      expect.objectContaining({
        params: expect.objectContaining({page: 1, per_page: 25}),
      }),
    ),
  );
});

it('offers direct page navigation while keeping previous and next controls', async () => {
  mockApi({orders: [baseOrder], lastPage: 6, total: 90});
  render(<Component />);

  await screen.findAllByText('Workbook');
  fireEvent.click(screen.getByRole('button', {name: 'Go to page 3'}));

  await waitFor(() =>
    expect(api.get).toHaveBeenCalledWith(
      '/api/v1/storefront/direct-orders',
      expect.objectContaining({
        params: expect.objectContaining({page: 3}),
      }),
    ),
  );
  expect(screen.getByRole('button', {name: 'Previous'})).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Next'})).toBeTruthy();
});

it('refreshes read-only order status without submitting a verification', async () => {
  mockApi({orders: [baseOrder], detail: {...baseOrder}});
  render(<Component />);
  fireEvent.click(await screen.findByRole('button', {name: 'View details'}));
  expect(await screen.findByText('Order details')).toBeTruthy();
  await waitFor(() => expect(screen.getByRole('button', {name: 'Refresh status'})).not.toHaveProperty('disabled', true));
  fireEvent.click(screen.getByRole('button', {name: 'Refresh status'}));
  await waitFor(() => {
    expect(api.get.mock.calls.filter(([url]) => url === '/api/v1/storefront/direct-orders/order-1').length).toBe(2);
  });
  expect(api.post).not.toHaveBeenCalled();
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

it('keeps Orders Chapa-only even for bookmarked retired gateway filters', async () => {
  window.history.replaceState({}, '', '/dashboard/orders?gateway=verify_et&status=manual_review');
  mockApi({orders: [baseOrder]});
  render(<Component />);
  await screen.findAllByText('Workbook');
  expect(api.get).toHaveBeenCalledWith(
    '/api/v1/storefront/direct-orders',
    expect.objectContaining({params: expect.objectContaining({gateway: 'chapa'})}),
  );
  expect(screen.queryByLabelText('Payment source')).toBeNull();
  expect(screen.queryByText('Chapa payments only · lifetime')).toBeNull();
  expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('all');
  expect(screen.queryByRole('tab', {name: 'Transactions'})).toBeNull();
  expect(api.get).not.toHaveBeenCalledWith('/api/v1/storefront/direct-orders/transactions', expect.anything());
});

it('folds Chapa payment details into payment information without a separate status panel', async () => {
  mockApi({
    orders: [baseOrder],
    detail: {
      ...baseOrder,
      paid_at: '2026-11-17T08:00:00Z',
      creator_earnings_cents: 9000,
      platform_fee_cents: 1000,
      verification: null,
      delivery: {status: 'paid', entitlements_count: 0, downloaded_count: 0, download_limit: 0, files: []},
    },
  });
  render(<Component />);
  expect(screen.getByRole('option', {name: 'Paid'})).toBeTruthy();
  const viewDetails = await screen.findByRole('button', {name: 'View details'});
  expect(viewDetails.querySelector('svg')).toBeTruthy();
  fireEvent.click(viewDetails);
  expect(await screen.findByText('Payment information')).toBeTruthy();
  expect(screen.getByText('Paid at')).toBeTruthy();
  expect(screen.getByText('Payment gateway')).toBeTruthy();
  expect(screen.queryByText('Chapa payment status')).toBeNull();
  // Orders table badge + filter option + summary badge.
  expect(screen.getAllByText('Paid')).toHaveLength(3);
  expect(screen.queryByText('Payment verified')).toBeNull();
  expect(screen.queryByText('Verification history')).toBeNull();
  expect(screen.queryByText('Historical verification evidence')).toBeNull();
  expect(screen.queryByText('Historical receiving account')).toBeNull();
  expect(screen.queryByText('No provider verification has been recorded for this order.')).toBeNull();
  expect(screen.queryByText(/Payment status reflects Linket/)).toBeNull();
});

it('surfaces order loading errors', async () => {
  mockApi({orderError: true});
  render(<Component />);

  const alert = await screen.findByRole('alert');
  expect(alert.textContent).toContain('Unable to load orders');
  expect(screen.getByRole('button', {name: 'Try again'})).toBeTruthy();
});

it('clearly breaks down free downloads from paid orders in summary', async () => {
  api.get.mockImplementation(((url: string) => {
    if (url === '/api/v1/storefront/direct-orders') {
      return Promise.resolve({
        data: {
          summary: {
            verified_sales_count: 3,
            verified_revenue_cents: 0,
            net_sales_cents: 0,
            paid_orders_count: 0,
            gross_profit_cents: 0,
            gross_profit_margin_percent: 0,
            average_order_cents: 0,
            free_orders_count: 3,
            creator_earnings_cents: 0,
            platform_fee_cents: 0,
            pending_count: 0,
            manual_review_count: 0,
            rejected_count: 0,
            status_counts: {paid: 3},
            currency: 'ETB',
          },
          data: {data: [], current_page: 1, last_page: 1, total: 3, per_page: 15},
        },
      });
    }
    return Promise.resolve({data: {}});
  }) as never);

  render(<Component />);

  expect(await screen.findByText('Net sales')).toBeTruthy();
  expect(screen.getAllByText('Orders').length).toBeGreaterThan(0);
  expect(screen.getByText('Gross profit · 0.0%')).toBeTruthy();
  expect(screen.getByText('Average order')).toBeTruthy();
  expect(screen.getAllByText('0 ETB').length).toBeGreaterThanOrEqual(2);
  expect(screen.queryByText('Net platform earnings')).toBeNull();
});

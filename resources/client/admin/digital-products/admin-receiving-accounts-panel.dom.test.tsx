/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {AdminReceivingAccountsPanel} from './admin-receiving-accounts-panel';

const api = vi.hoisted(() => ({get: vi.fn(), post: vi.fn()}));
vi.mock('@common/http/query-client', () => ({apiClient: api}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message, values}: {message: string; values?: Record<string, unknown>}) => {
    if (!values) return message;
    return Object.entries(values).reduce(
      (text, [key, value]) => text.replace(`:${key}`, String(value)),
      message,
    );
  },
}));
vi.mock('@shadcn/button/button', () => ({Button: 'button'}));
vi.mock('@shadcn/spinner/spinner', () => ({Spinner: () => <span>Loading</span>}));
vi.mock('@shadcn/card/card', () => ({
  Card: {Root: 'div', Header: 'div', Title: 'h2', Description: 'p', Content: 'div'},
}));
vi.mock('@shadcn/badge/badge', () => ({Badge: 'span'}));
vi.mock('@shadcn/forms/input/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));
vi.mock('@shadcn/forms/select/select', () => ({
  Select: {
    Root: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    Trigger: ({children}: {children: React.ReactNode}) => <button type="button">{children}</button>,
    Value: ({placeholder}: {placeholder?: React.ReactNode}) => <span>{placeholder}</span>,
    Content: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    Item: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
  },
}));
vi.mock('@shadcn/dialog/dialog', () => ({
  Dialog: {
    Root: ({children, open}: {children: React.ReactNode; open: boolean}) => (open ? <div>{children}</div> : null),
    Portal: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    Backdrop: () => null,
    Content: ({children}: {children: React.ReactNode}) => <div role="dialog">{children}</div>,
    Header: ({children}: {children: React.ReactNode}) => <header>{children}</header>,
    Body: ({children}: {children: React.ReactNode}) => <div>{children}</div>,
    Title: ({children}: {children: React.ReactNode}) => <h2>{children}</h2>,
    Description: ({children}: {children: React.ReactNode}) => <p>{children}</p>,
    Footer: ({children}: {children: React.ReactNode}) => <footer>{children}</footer>,
  },
}));

vi.mock('./bank-logo', () => ({BankLogo: () => <span>Logo</span>}));
vi.mock('react-router', () => ({Link: 'a'}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.history.replaceState({}, '', '/admin/financial/payment-gateways');
});

const pendingAccount = {
  id: 9,
  creator_name: 'Local administrator',
  creator_email: 'admin@admin.com',
  creator_admin_url: '/admin/creators/3',
  provider: 'cbe',
  provider_display_name: 'Commercial Bank of Ethiopia',
  account_masked: '•••• 4321',
  account_name: 'Search Owner',
  status: 'pending',
  lifecycle_state: 'pending_ownership_review',
  is_active: false,
  is_suspended: false,
  linket_approved: false,
  verify_et_registered: false,
  checkout_eligible: false,
  submitted_at: '2026-10-30T12:00:00Z',
  has_proof: true,
  audits: [],
};

it('loads search from the URL on the receiving accounts index', async () => {
  window.history.replaceState({}, '', '/admin/financial/withdrawal-methods?search=admin%40admin.com');
  api.get.mockResolvedValue({
    data: {
      summary: {pending: 1, approved: 0, rejected: 0, suspended: 0},
      data: {
        data: [
          pendingAccount,
          {
            ...pendingAccount,
            id: 10,
            provider: 'telebirr',
            provider_display_name: 'Telebirr',
            account_masked: '•••• 5798',
          },
        ],
        last_page: 1,
      },
    },
  });
  render(<AdminReceivingAccountsPanel />);
  expect(await screen.findByText('admin@admin.com')).toBeTruthy();
  expect(screen.getAllByText('Local administrator')).toHaveLength(1);
  const table = screen.getByRole('table');
  expect(table.textContent).toContain('Commercial Bank of Ethiopia');
  expect(table.textContent).toContain('Telebirr');
  expect(screen.getAllByRole('button', {name: 'Open creator'})).toHaveLength(1);
  expect(screen.getAllByRole('button', {name: 'Review'})).toHaveLength(2);
  expect(api.get).toHaveBeenCalledWith(
    '/api/v1/admin/storefront/payment-methods',
    expect.objectContaining({
      params: expect.objectContaining({search: 'admin@admin.com'}),
    }),
  );
});

it('opens review details and approves from the financial index', async () => {
  api.get.mockImplementation(async (url: string) => {
    if (url.endsWith('/payment-methods/9')) {
      return {
        data: {
          data: {
            ...pendingAccount,
            account_number: '1000123456789',
            checkout_blockers: ['linket_approval', 'verify_et'],
            reviewer_name: null,
            audits: [],
          },
        },
      };
    }
    return {
      data: {
        summary: {pending: 1, approved: 0, rejected: 0, suspended: 0},
        data: {data: [pendingAccount], last_page: 1},
      },
    };
  });
  api.post.mockResolvedValue({data: {data: {...pendingAccount, status: 'approved', linket_approved: true}}});

  render(<AdminReceivingAccountsPanel />);

  expect(await screen.findByText('Commercial Bank of Ethiopia')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', {name: 'Review'}));
  expect(await screen.findByText('Review receiving account')).toBeTruthy();
  expect(screen.getByText('1000123456789')).toBeTruthy();
  expect(screen.getByText('Checkout unavailable')).toBeTruthy();
  expect(screen.getByText('Verify.et registration is not recorded.')).toBeTruthy();
  expect(screen.getByText('View ownership proof')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name: 'Approve account'}));
  expect(await screen.findByText('Approve this receiving account?')).toBeTruthy();
  fireEvent.click(screen.getAllByRole('button', {name: 'Approve account'}).at(-1)!);
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/admin/storefront/payment-methods/9/approve',
      undefined,
    ),
  );
});

it('opens review details and approves from the creator detail card', async () => {
  api.get.mockImplementation(async (url: string) => {
    if (url.endsWith('/payment-methods/9')) {
      return {
        data: {
          data: {
            ...pendingAccount,
            account_number: '1000123456789',
            checkout_blockers: ['linket_approval', 'verify_et'],
            reviewer_name: null,
            audits: [],
          },
        },
      };
    }
    return {
      data: {
        summary: {pending: 1, approved: 0, rejected: 0, suspended: 0},
        data: {data: [pendingAccount], last_page: 1},
      },
    };
  });
  api.post.mockResolvedValue({data: {data: {...pendingAccount, status: 'approved', linket_approved: true}}});

  render(<AdminReceivingAccountsPanel embedded />);

  expect(await screen.findByText('Commercial Bank of Ethiopia')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', {name: 'Review'}));
  expect(await screen.findByText('Review receiving account')).toBeTruthy();
  expect(screen.getByText('1000123456789')).toBeTruthy();
  expect(screen.getByText('Checkout unavailable')).toBeTruthy();
  expect(screen.getByText('Verify.et registration is not recorded.')).toBeTruthy();
  expect(screen.getByText('View ownership proof')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name: 'Approve account'}));
  expect(await screen.findByText('Approve this receiving account?')).toBeTruthy();
  fireEvent.click(screen.getAllByRole('button', {name: 'Approve account'}).at(-1)!);
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/admin/storefront/payment-methods/9/approve',
      undefined,
    ),
  );
});

it('requires a reason before rejecting an account', async () => {
  api.get.mockImplementation(async (url: string) => {
    if (String(url).endsWith('/payment-methods/9')) {
      return {data: {data: {...pendingAccount, audits: []}}};
    }
    return {
      data: {
        summary: {pending: 1, approved: 0, rejected: 0, suspended: 0},
        data: {data: [pendingAccount], last_page: 1},
      },
    };
  });
  api.post.mockResolvedValue({data: {data: {...pendingAccount, status: 'rejected'}}});

  render(<AdminReceivingAccountsPanel embedded />);
  fireEvent.click(await screen.findByRole('button', {name: 'Review'}));
  expect(await screen.findByRole('button', {name: 'Reject'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name: 'Reject'}));
  expect(await screen.findByText('Reject account')).toBeTruthy();
  const confirm = screen.getByRole('button', {name: 'Confirm'});
  expect((confirm as HTMLButtonElement).disabled).toBe(true);
  fireEvent.change(screen.getByLabelText('Reason'), {target: {value: 'Proof mismatch'}});
  expect((confirm as HTMLButtonElement).disabled).toBe(false);
  fireEvent.click(confirm);
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/admin/storefront/payment-methods/9/reject',
      {reason: 'Proof mismatch'},
    ),
  );
});

it('explains when payment verification is unavailable', async () => {
  api.get.mockImplementation(async (url: string) => {
    if (url.endsWith('/payment-methods/9')) {
      return {data: {data: {...pendingAccount, checkout_blockers: ['verification_unavailable'], audits: []}}};
    }
    return {data: {summary: {pending: 1, approved: 0, rejected: 0, suspended: 0}, data: {data: [pendingAccount], last_page: 1}}};
  });
  render(<AdminReceivingAccountsPanel />);
  fireEvent.click(await screen.findByRole('button', {name: 'Review'}));
  expect(await screen.findByText('Payment verification is temporarily unavailable.')).toBeTruthy();
});

/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {MemoryRouter} from 'react-router';
import {DirectPaymentModal, type DirectCheckout} from './direct-payment-modal';

const api = vi.hoisted(() => ({get: vi.fn(), post: vi.fn()}));
vi.mock('@common/http/query-client', () => ({apiClient: api}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message, values}: {message: string; values?: Record<string, unknown>}) => {
    if (!values) return message;
    return Object.entries(values).reduce(
      (acc, [key, val]) => acc.replace(`:${key}`, String(val)),
      message,
    );
  },
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
  vi.resetAllMocks();
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

it('rejects a pasted receiving account number without calling the verification provider', async () => {
  api.get.mockResolvedValue({
    data: {
      data: {
        provider: 'cbe',
        account_number: '1000123456789',
        account_name: 'Test Recipient',
        amount_cents: 46000,
        currency: 'ETB',
      },
    },
  });

  render(
    <MemoryRouter>
      <DirectPaymentModal checkout={checkout} onClose={() => undefined} />
    </MemoryRouter>,
  );

  const referenceInput = await screen.findByPlaceholderText('e.g. fHCxyTVljBclm6Yk4C or FT...');
  fireEvent.change(referenceInput, {target: {value: '1000123456789'}});
  fireEvent.click(screen.getByRole('button', {name: 'Verify payment'}));

  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('receiving account number'));
  expect(api.post).not.toHaveBeenCalled();

  fireEvent.change(referenceInput, {target: {value: 'fHCxyTVljBclm6Yk4C'}});
  expect(screen.queryByRole('alert')).toBeNull();
});

it('hides payment destination details while waiting for verification rather than asking to pay again', async () => {
  api.get.mockResolvedValue({
    data: {
      data: {
        provider: 'cbe',
        account_number: '1000123456789',
        account_name: 'Test Recipient',
        amount_cents: 46000,
        currency: 'ETB',
        status: 'verifying',
      },
    },
  });

  render(
    <MemoryRouter>
      <DirectPaymentModal checkout={{...checkout, status: 'verifying'}} onClose={() => undefined} />
    </MemoryRouter>,
  );

  expect(await screen.findByText('Verifying')).toBeTruthy();
  expect(screen.getByText('Track the verification of your existing payment. Do not transfer again.')).toBeTruthy();
  expect(screen.queryByText('Account number')).toBeNull();
  expect(screen.queryByRole('button', {name: 'Verify payment'})).toBeNull();
});

it('does not require a suffix on modern long CBE FT references', async () => {
  api.get.mockResolvedValue({
    data: {
      data: {
        provider: 'cbe',
        account_number: '1000123456789',
        account_name: 'Test Recipient',
        amount_cents: 46000,
        currency: 'ETB',
      },
    },
  });
  api.post.mockResolvedValueOnce({data: {status: 'verifying'}});

  render(
    <MemoryRouter>
      <DirectPaymentModal checkout={checkout} onClose={() => undefined} />
    </MemoryRouter>,
  );

  const referenceInput = await screen.findByPlaceholderText('e.g. fHCxyTVljBclm6Yk4C or FT...');
  fireEvent.change(referenceInput, {target: {value: 'FT1234567890123456'}});
  expect(screen.queryByText('Eight-digit CBE FT suffix')).toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Verify payment'}));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith(
    checkout.reference_endpoint,
    {reference: 'FT1234567890123456', account_suffix: undefined},
    {headers: {'X-Order-Access-Token': 'token'}},
  ));
});

it('supports switching dynamic receiving accounts', async () => {
  api.get.mockResolvedValueOnce({
    data: {
      data: {
        provider: 'cbe',
        receiving_account_id: 1,
        bank_name: 'Commercial Bank of Ethiopia',
        account_number: '1000123456789',
        account_name: 'Abebe Kebede',
        amount_cents: 10000,
        currency: 'ETB',
        available_accounts: [
          {
            id: 1,
            provider: 'cbe',
            bank_name: 'Commercial Bank of Ethiopia',
            account_number: '1000123456789',
            account_ending: '6789',
            account_name: 'Abebe Kebede',
          },
          {
            id: 2,
            provider: 'dashen',
            bank_name: 'Dashen Bank',
            account_number: '5000987654321',
            account_ending: '4321',
            account_name: 'Abebe Kebede',
          },
        ],
      },
    },
  });

  api.post.mockResolvedValueOnce({
    data: {
      data: {
        provider: 'dashen',
        receiving_account_id: 2,
        bank_name: 'Dashen Bank',
        account_number: '5000987654321',
        account_name: 'Abebe Kebede',
        amount_cents: 10000,
        currency: 'ETB',
        available_accounts: [
          {
            id: 1,
            provider: 'cbe',
            bank_name: 'Commercial Bank of Ethiopia',
            account_number: '1000123456789',
            account_ending: '6789',
            account_name: 'Abebe Kebede',
          },
          {
            id: 2,
            provider: 'dashen',
            bank_name: 'Dashen Bank',
            account_number: '5000987654321',
            account_ending: '4321',
            account_name: 'Abebe Kebede',
          },
        ],
      },
    },
  });

  render(
    <MemoryRouter>
      <DirectPaymentModal checkout={checkout} onClose={() => undefined} />
    </MemoryRouter>,
  );

  expect(await screen.findByRole('button', {name: /Commercial Bank of Ethiopia/})).toBeTruthy();
  const dashenButton = screen.getByRole('button', {name: /Dashen Bank/});
  expect(dashenButton).toBeTruthy();

  dashenButton.click();

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/public/direct-orders/order-1/select-account',
      {receiving_account_id: 2},
      {headers: {'X-Order-Access-Token': 'token'}},
    );
  });
});

it('renders attempt counter and session locked state when attempts are exceeded', async () => {
  api.get.mockResolvedValueOnce({
    data: {
      data: {
        provider: 'cbe',
        account_number: '1000123456789',
        account_name: 'Abebe Kebede',
        amount_cents: 10000,
        currency: 'ETB',
        verification_attempts: 2,
        attempts_remaining: 3,
        session_locked: false,
      },
    },
  });

  const {rerender} = render(
    <MemoryRouter>
      <DirectPaymentModal checkout={checkout} onClose={() => undefined} />
    </MemoryRouter>,
  );

  expect(await screen.findByText(/Attempts remaining: 3 of 5/)).toBeTruthy();

  // Now rerender with locked session
  api.get.mockResolvedValueOnce({
    data: {
      data: {
        provider: 'cbe',
        account_number: '1000123456789',
        account_name: 'Abebe Kebede',
        amount_cents: 10000,
        currency: 'ETB',
        verification_attempts: 5,
        attempts_remaining: 0,
        session_locked: true,
      },
    },
  });

  rerender(
    <MemoryRouter>
      <DirectPaymentModal checkout={{...checkout, status: 'cancelled'}} onClose={() => undefined} />
    </MemoryRouter>,
  );

  expect(await screen.findByText(/Session locked/)).toBeTruthy();
  expect(screen.queryByRole('button', {name: 'Verify payment'})).toBeNull();
});

it('renders post-payment delivering state vs delivered state', async () => {
  api.get.mockResolvedValueOnce({
    data: {
      data: {
        status: 'paid',
        delivery_status: 'delivering',
        downloads: [],
      },
    },
  });

  const {rerender} = render(
    <MemoryRouter>
      <DirectPaymentModal checkout={{...checkout, status: 'paid'}} onClose={() => undefined} />
    </MemoryRouter>,
  );

  expect(await screen.findByText(/Payment confirmed! Preparing your digital download.../)).toBeTruthy();

  // Once delivered
  api.get.mockResolvedValueOnce({
    data: {
      data: {
        status: 'paid',
        delivery_status: 'delivered',
        downloads: [{name: 'ebook.pdf', remaining_downloads: 5, url: '/storefront/downloads/ebook'}],
      },
    },
  });

  rerender(
    <MemoryRouter>
      <DirectPaymentModal checkout={{...checkout, status: 'paid', order_id: 'order-1-delivered'}} onClose={() => undefined} />
    </MemoryRouter>,
  );

  expect(await screen.findByText('Payment confirmed. Your purchased files are ready to download.')).toBeTruthy();
  expect(screen.getByText('ebook.pdf')).toBeTruthy();
  expect(screen.getByText(/Delivered/)).toBeTruthy();
});

it('shows a payment-received message and stops polling when delivery fails', async () => {
  api.get.mockResolvedValue({
    data: {
      data: {
        status: 'paid',
        delivery_status: 'failed',
        downloads: [],
      },
    },
  });

  render(
    <MemoryRouter>
      <DirectPaymentModal checkout={{...checkout, status: 'paid'}} onClose={() => undefined} />
    </MemoryRouter>,
  );

  expect(await screen.findByText(/Payment received. Your files are not ready yet./)).toBeTruthy();
  await waitFor(() => expect(api.get).toHaveBeenCalled());
  const callsAfterPaint = api.get.mock.calls.length;
  await new Promise(resolve => window.setTimeout(resolve, 30));
  expect(api.get.mock.calls.length).toBe(callsAfterPaint);
});

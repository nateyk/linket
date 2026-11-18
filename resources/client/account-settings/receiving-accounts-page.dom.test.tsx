/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {Component} from './receiving-accounts-page';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@common/http/query-client', () => ({apiClient: api}));
vi.mock('@ui/i18n/trans', () => ({Trans: ({message}: {message: string}) => message}));
vi.mock('@ui/i18n/message', () => ({message: (message: string) => ({message})}));
vi.mock('@ui/i18n/use-trans', () => ({useTrans: () => ({trans: ({message}: {message: string}) => message})}));
vi.mock('@app/account-settings/account-settings-page-layout', () => ({
  AccountSettingsPageLayout: ({
    children,
    title,
    headerRightContent,
  }: {
    children: React.ReactNode;
    title?: React.ReactNode;
    headerRightContent?: React.ReactNode;
  }) => (
    <main>
      <header>
        <h1>{title}</h1>
        {headerRightContent}
      </header>
      {children}
    </main>
  ),
}));
vi.mock('@shadcn/forms/input/input', () => ({
  Input: ({bindToHookForm: _ignored, ...props}: Record<string, unknown>) => <input {...props} />,
}));
vi.mock('@shadcn/spinner/spinner', () => ({Spinner: () => <span>Loading</span>}));
vi.mock('@shadcn/forms/select/select', () => ({
  Select: {
    Root: ({
      children,
      onValueChange,
    }: {
      children: React.ReactNode;
      onValueChange: (value: string) => void;
    }) => (
      <select
        aria-label="Bank or Wallet"
        onChange={event => onValueChange(event.target.value)}
      >
        {children}
      </select>
    ),
    Trigger: () => null,
    Value: () => null,
    Content: ({children}: {children: React.ReactNode}) => children,
    Group: ({children}: {children: React.ReactNode}) => children,
    Item: ({value}: {value: string}) => (
      <option value={value}>{value}</option>
    ),
  },
}));
vi.mock('@shadcn/forms/checkbox/checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    id,
    disabled,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    id?: string;
    disabled?: boolean;
  }) => (
    <input
      type="checkbox"
      id={id}
      checked={checked}
      disabled={disabled}
      onChange={e => onCheckedChange?.(e.target.checked)}
    />
  ),
}));

// jsdom Web Animations API shim
if (!(Element.prototype as unknown as {getAnimations?: unknown}).getAnimations) {
  (Element.prototype as unknown as {getAnimations: () => []}).getAnimations = () => [];
}

api.get.mockImplementation((url: string) => {
  if (url === '/api/v1/items/payout-banks') {
    return Promise.resolve({data: {data: [
      {code: 'cbe'}, {code: 'telebirr'}, {code: 'mpesa'},
      {code: 'yaya'}, {code: 'cbebirr'},
    ]}});
  }
  return Promise.resolve({data: {data: []}});
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

it('lists payout accounts with default badges and masked account numbers', async () => {
  const account1 = {
    id: 1,
    type: 'bank_transfer',
    bank_code: 'cbe',
    bank_name: 'Commercial Bank of Ethiopia (CBE)',
    account_holder: 'Abebe Bikila',
    account_number_last_four: '6789',
    masked_account_number: '•••• 6789',
    display_label: 'Commercial Bank of Ethiopia (•••• 6789)',
    is_active: true,
    is_default: true,
    status: 'active',
  };
  const account2 = {
    id: 2,
    type: 'telebirr',
    bank_code: 'telebirr',
    bank_name: 'Telebirr (Ethio Telecom)',
    account_holder: 'Abebe Bikila',
    account_number_last_four: '3344',
    masked_account_number: '•••• 3344',
    display_label: 'Telebirr (•••• 3344)',
    is_active: true,
    is_default: false,
    status: 'active',
  };

  api.get.mockImplementation((url: string) => url === '/api/v1/items/payout-banks'
    ? Promise.resolve({data: {data: [{code: 'cbe'}, {code: 'telebirr'}]}})
    : Promise.resolve({data: {data: [account1, account2]}}));

  render(<Component />);

  expect(await screen.findByText('Commercial Bank of Ethiopia (CBE)')).toBeTruthy();
  expect(screen.getByText('Telebirr (Ethio Telecom)')).toBeTruthy();
  expect(screen.getByText('•••• 6789')).toBeTruthy();
  expect(screen.getByText('•••• 3344')).toBeTruthy();
  expect(screen.getByText('Default')).toBeTruthy();
});

it('shows only admin-enabled Chapa v1 banks and wallets in seller dropdown', async () => {
  api.get.mockImplementation((url: string) => {
    if (url === '/api/v1/items/payout-banks') {
      return Promise.resolve({data: {data: [
        {code: 'cbe', is_active: true},
        {code: 'telebirr', is_active: true},
        {code: 'mpesa', is_active: false},
        {code: 'yaya', is_active: false},
        {code: 'cbebirr', is_active: false},
        {code: 'paypal', is_active: true},
        {code: 'other', is_active: true},
      ]}});
    }
    if (url === '/api/v1/items/payout-methods') {
      return Promise.resolve({data: {data: []}});
    }
    return Promise.reject(new Error('Unexpected API route: ' + url));
  });

  render(<Component />);
  expect(await screen.findByText('No payout accounts yet')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name: 'Add payout account'}));

  const options = Array.from(
    (screen.getByLabelText('Bank or Wallet') as HTMLSelectElement).options,
  ).map(option => option.value);

  expect(options).toContain('telebirr');
  expect(options).toContain('cbe');
  expect(options).not.toContain('awash');
  expect(options).not.toContain('boa');
  expect(options).not.toContain('dashen');
  expect(options).not.toContain('mpesa');
  expect(options).not.toContain('yaya');
  expect(options).not.toContain('cbebirr');
  expect(options).not.toContain('paypal');
  expect(options).not.toContain('other');
  expect(api.get).toHaveBeenCalledWith('/api/v1/items/payout-banks');
  expect(api.get).toHaveBeenCalledWith('/api/v1/items/payout-methods');
});

it('keeps account creation disabled if no providers are enabled', async () => {
  api.get.mockImplementation((url: string) =>
    url === '/api/v1/items/payout-banks'
      ? Promise.resolve({data: {data: []}})
      : Promise.resolve({data: {data: []}}),
  );

  render(<Component />);

  expect(await screen.findByText(
    'No Chapa payout destinations are currently available. Check with Linket support.',
  )).toBeTruthy();
  expect((screen.getByRole('button', {name: 'Add payout account'}) as HTMLButtonElement).disabled).toBe(true);
});

it('shows retry instead of a blank picker when provider loading fails', async () => {
  api.get.mockImplementation((url: string) =>
    url === '/api/v1/items/payout-banks'
      ? Promise.reject(new Error('Network unavailable'))
      : Promise.resolve({data: {data: []}}),
  );

  render(<Component />);

  expect((await screen.findByRole('alert')).textContent).toContain(
    'Unable to load Chapa payout destinations or accounts. Retry to continue.',
  );
  expect(screen.getByRole('button', {name: 'Retry loading payout destinations'})).toBeTruthy();
  expect((screen.getByRole('button', {name: 'Add payout account'}) as HTMLButtonElement).disabled).toBe(true);
  expect(api.get).not.toHaveBeenCalledWith('/api/v1/storefront/payment-methods');
});

it('opens modal and creates a new payout destination via POST /api/v1/items/payout-methods', async () => {
  api.get.mockImplementation((url: string) => url === '/api/v1/items/payout-banks'
    ? Promise.resolve({data: {data: [{code: 'cbe'}, {code: 'telebirr'}]}})
    : Promise.resolve({data: {data: []}}));
  api.post.mockResolvedValue({data: {data: {id: 10}}});

  render(<Component />);

  expect(await screen.findByText('No payout accounts yet')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name: 'Add payout account'}));

  fireEvent.change(screen.getByLabelText('Bank or Wallet'), {target: {value: 'cbe'}});
  fireEvent.change(screen.getByLabelText('Account or wallet number'), {target: {value: '1000123456789'}});
  fireEvent.change(screen.getByLabelText('Account holder name'), {target: {value: 'Abebe Bikila'}});

  fireEvent.click(screen.getByRole('button', {name: 'Save payout account'}));

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith('/api/v1/items/payout-methods', {
      type: 'bank_transfer',
      bank_code: 'cbe',
      bank_name: 'Commercial Bank of Ethiopia (CBE)',
      account_holder: 'Abebe Bikila',
      destination: '1000123456789',
      is_default: true,
    });
  });
});

it('edits an existing payout destination via PUT /api/v1/items/payout-methods/:id', async () => {
  const account = {
    id: 5,
    type: 'telebirr',
    bank_code: 'telebirr',
    bank_name: 'Telebirr (Ethio Telecom)',
    account_holder: 'Old Holder Name',
    account_number_last_four: '3344',
    masked_account_number: '•••• 3344',
    is_active: true,
    is_default: false,
    status: 'active',
  };

  api.get.mockImplementation((url: string) => url === '/api/v1/items/payout-banks'
    ? Promise.resolve({data: {data: [{code: 'cbe'}, {code: 'telebirr'}]}})
    : Promise.resolve({data: {data: [account]}}));
  api.put.mockResolvedValue({data: {data: {...account, account_holder: 'Updated Holder'}}});

  render(<Component />);

  expect(await screen.findByText('Old Holder Name')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', {name: 'Account actions'}));
  fireEvent.click(await screen.findByRole('menuitem', {name: 'Edit account'}));

  fireEvent.change(screen.getByLabelText('Account or wallet number'), {target: {value: '0911223344'}});
  fireEvent.change(screen.getByLabelText('Account holder name'), {target: {value: 'Updated Holder'}});

  fireEvent.click(screen.getByRole('button', {name: 'Save payout account'}));

  await waitFor(() => {
    expect(api.put).toHaveBeenCalledWith('/api/v1/items/payout-methods/5', {
      type: 'telebirr',
      bank_code: 'telebirr',
      bank_name: 'telebirr',
      account_holder: 'Updated Holder',
      destination: '0911223344',
      is_default: false,
    });
  });
});

it('sets a destination as default via POST /api/v1/items/payout-methods/:id/default', async () => {
  const account = {
    id: 8,
    type: 'bank_transfer',
    bank_code: 'cbe',
    bank_name: 'Commercial Bank of Ethiopia (CBE)',
    account_holder: 'Abebe Bikila',
    account_number_last_four: '8899',
    masked_account_number: '•••• 8899',
    is_active: true,
    is_default: false,
    status: 'active',
  };

  api.get.mockImplementation((url: string) => url === '/api/v1/items/payout-banks'
    ? Promise.resolve({data: {data: [{code: 'cbe'}, {code: 'telebirr'}]}})
    : Promise.resolve({data: {data: [account]}}));
  api.post.mockResolvedValue({data: {}});

  render(<Component />);

  expect(await screen.findByText('Commercial Bank of Ethiopia (CBE)')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', {name: 'Account actions'}));
  fireEvent.click(await screen.findByRole('menuitem', {name: 'Set as default'}));

  await waitFor(() => {
    expect(api.post).toHaveBeenCalledWith('/api/v1/items/payout-methods/8/default');
  });
});

it('removes a payout destination via DELETE /api/v1/items/payout-methods/:id', async () => {
  const account = {
    id: 9,
    type: 'bank_transfer',
    bank_code: 'dashen',
    bank_name: 'Dashen Bank',
    account_holder: 'Abebe Bikila',
    account_number_last_four: '9900',
    masked_account_number: '•••• 9900',
    is_active: true,
    is_default: false,
    status: 'active',
  };

  api.get.mockImplementation((url: string) => url === '/api/v1/items/payout-banks'
    ? Promise.resolve({data: {data: [{code: 'cbe'}, {code: 'telebirr'}]}})
    : Promise.resolve({data: {data: [account]}}));
  api.delete.mockResolvedValue({data: {}});

  render(<Component />);

  expect(await screen.findByText('Dashen Bank')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', {name: 'Account actions'}));
  fireEvent.click(await screen.findByRole('menuitem', {name: 'Remove account'}));

  await waitFor(() => {
    expect(api.delete).toHaveBeenCalledWith('/api/v1/items/payout-methods/9');
  });
});

it('displays info popover explaining Linket withdrawal payouts', async () => {
  api.get.mockImplementation((url: string) => url === '/api/v1/items/payout-banks'
    ? Promise.resolve({data: {data: [{code: 'cbe'}, {code: 'telebirr'}]}})
    : Promise.resolve({data: {data: []}}));

  render(<Component />);

  expect(
    screen.queryByText('Bank and mobile money accounts used to receive your Linket withdrawal payouts.'),
  ).toBeNull();

  fireEvent.click(
    await screen.findByRole('button', {name: 'About payout accounts'}),
  );

  expect(
    await screen.findByText('Bank and mobile money accounts used to receive your Linket withdrawal payouts.'),
  ).toBeTruthy();
});

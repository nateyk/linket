/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {Component} from './receiving-accounts-page';

const api = vi.hoisted(() => ({get: vi.fn(), post: vi.fn(), put: vi.fn()}));
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
vi.mock('@shadcn/forms/input/input', () => ({Input: ({bindToHookForm: _ignored, ...props}: Record<string, unknown>) => <input {...props} />}));
vi.mock('@shadcn/spinner/spinner', () => ({Spinner: () => <span>Loading</span>}));
vi.mock('@shadcn/forms/select/select', () => ({Select: {Root: ({children, onValueChange}: {children: React.ReactNode; onValueChange: (value: string) => void}) => <select aria-label="Payment method" onChange={event => onValueChange(event.target.value)}>{children}</select>, Trigger: () => null, Value: () => null, Content: ({children}: {children: React.ReactNode}) => children, Group: ({children}: {children: React.ReactNode}) => children, Item: ({children, value}: {children: React.ReactNode; value: string}) => <option value={value}>{children}</option>}}));

// jsdom has no Web Animations API. Base UI's dropdown scroll area queries
// getAnimations() after its popup opens, so provide the same no-op browser
// shim used by the other Base UI DOM tests in this repository.
if (!(Element.prototype as unknown as {getAnimations?: unknown}).getAnimations) {
  (Element.prototype as unknown as {getAnimations: () => []}).getAnimations =
    () => [];
}
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('lists, creates, resubmits and changes activation through the page', async () => {
  const account = {id: 4, provider: 'telebirr', account_name: 'Test Owner', account_ending: '5678', status: 'approved', is_active: false, is_suspended: false, provider_registration_status: 'registered'};
  api.get.mockResolvedValue({data: {data: [account], available_methods: [{code: 'telebirr', name: 'Telebirr'}]}});
  api.post.mockResolvedValue({data: {}});
  render(<Component />);
  expect(await screen.findByText(/Test Owner/)).toBeTruthy();
  expect(screen.getByText('Telebirr')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name: 'Add receiving account'}));
  fireEvent.change(screen.getByLabelText('Payment method'), {target: {value: 'telebirr'}});
  fireEvent.change(screen.getByLabelText('Account or wallet number'), {target: {value: '0912345678'}});
  fireEvent.change(screen.getByLabelText('Account holder name'), {target: {value: 'Test Owner'}});
  fireEvent.change(screen.getByLabelText('Ownership evidence'), {target: {files: [new File(['proof'], 'proof.pdf', {type: 'application/pdf'})]}});
  fireEvent.click(screen.getByRole('button', {name: 'Submit account for review'}));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/storefront/payment-methods', expect.any(FormData)));
  expect((api.post.mock.calls[0][1] as FormData).get('account_number')).toBe('0912345678');
  fireEvent.click(screen.getByRole('button', {name: 'Account actions'}));
  fireEvent.click(await screen.findByRole('menuitem', {name: 'Edit account'}));
  fireEvent.change(screen.getByLabelText('Account or wallet number'), {target: {value: '0912345679'}});
  fireEvent.change(screen.getByLabelText('Ownership evidence'), {target: {files: [new File(['proof'], 'proof.pdf', {type: 'application/pdf'})]}});
  fireEvent.click(screen.getByRole('button', {name: 'Submit account for review'}));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/storefront/payment-methods/4/resubmit', expect.any(FormData)));
  api.get.mockResolvedValue({data: {data: [{...account, is_active: true}], available_methods: [{code: 'telebirr', name: 'Telebirr'}]}});
  fireEvent.click(screen.getByRole('button', {name: 'Account actions'}));
  fireEvent.click(await screen.findByRole('menuitem', {name: 'Activate'}));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/storefront/payment-methods/4/activate'));
  fireEvent.click(await screen.findByRole('button', {name: 'Account actions'}));
  fireEvent.click(await screen.findByRole('menuitem', {name: 'Deactivate'}));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/storefront/payment-methods/4/deactivate'));
});

it('explains pending and rejected approvals without offering activation', async () => {
  api.get.mockResolvedValue({data: {data: [
    {id: 1, provider: 'cbe', account_name: 'Pending Owner', account_ending: '1111', status: 'pending', is_active: false, is_suspended: false, provider_registration_status: 'pending'},
    {id: 2, provider: 'cbe', account_name: 'Rejected Owner', account_ending: '2222', status: 'rejected', is_active: false, is_suspended: false, provider_registration_status: 'pending'},
  ], available_methods: [{code: 'cbe', name: 'CBE'}]}});
  render(<Component />);
  expect(await screen.findByText('Pending review')).toBeTruthy();
  expect(screen.getByText('Rejected')).toBeTruthy();
  expect(screen.getAllByRole('button', {name: 'Account actions'})).toHaveLength(2);
  fireEvent.click(screen.getAllByRole('button', {name: 'Account actions'})[0]);
  expect(screen.queryByRole('menuitem', {name: 'Activate'})).toBeNull();
  expect(screen.queryByRole('menuitem', {name: 'Deactivate'})).toBeNull();
});


it('moves the checkout explanation behind the compact info control', async () => {
  api.get.mockResolvedValue({data: {data: [], available_methods: [{code: 'cbe', name: 'CBE'}]}});
  render(<Component />);

  expect(
    screen.queryByText('Accounts customers can pay directly at checkout.'),
  ).toBeNull();
  fireEvent.click(
    await screen.findByRole('button', {name: 'About receiving accounts'}),
  );
  expect(
    await screen.findByText('Accounts customers can pay directly at checkout.'),
  ).toBeTruthy();
});

it('shows an empty state and only offers enabled providers', async () => {
  api.get.mockResolvedValue({data: {data: [], available_methods: [{code: 'cbe', name: 'CBE'}]}});
  render(<Component />);
  expect(await screen.findByText('No receiving accounts yet')).toBeTruthy();
  expect(screen.getByText('Add a bank or wallet account in this workspace to receive customer payments.')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name: 'Add receiving account'}));
  expect(screen.getByRole('option', {name: /CBE/})).toBeTruthy();
  expect(screen.queryByRole('option', {name: /Telebirr/})).toBeNull();
});

it('keeps suspended accounts visible without activation or resubmission actions', async () => {
  api.get.mockResolvedValue({data: {data: [{id: 7, provider: 'awash', account_name: 'Suspended Owner', account_ending: '1234', status: 'approved', is_active: false, is_suspended: true, provider_registration_status: 'registered'}], available_methods: [{code: 'awash', name: 'Awash'}]}});
  render(<Component />);
  expect((await screen.findAllByText('Suspended')).length).toBeGreaterThan(0);
  expect(screen.getByText('Awash')).toBeTruthy();
  expect(screen.queryByRole('button', {name: 'Account actions'})).toBeNull();
  expect(screen.queryByRole('button', {name: 'Edit account'})).toBeNull();
});

it('shows checkout eligibility from the account API', async () => {
  api.get.mockResolvedValue({data: {data: [
    {id: 1, provider: 'cbe', account_name: 'Available Owner', account_ending: '1234', status: 'approved', is_active: true, is_suspended: false, provider_registration_status: 'registered', checkout_eligible: true},
    {id: 2, provider: 'cbe', account_name: 'Disabled Owner', account_ending: '5678', status: 'approved', is_active: true, is_suspended: false, provider_registration_status: 'registered', checkout_eligible: false},
  ], available_methods: [{code: 'cbe', name: 'CBE'}]}});
  render(<Component />);
  expect(await screen.findByText('Available')).toBeTruthy();
  expect(screen.getByText('Unavailable')).toBeTruthy();
  expect(screen.getAllByText('Approved').length).toBe(2);
  expect(screen.getAllByText('Checkout status').length).toBe(2);
});

it('keeps readable bank names and logo rendering in the selected-value implementation', async () => {
  api.get.mockResolvedValue({data: {data: [], available_methods: [
    {code: 'cbe', name: 'Commercial Bank of Ethiopia'},
    {code: 'telebirr', name: 'Telebirr'},
  ]}});
  render(<Component />);
  fireEvent.click(await screen.findByRole('button', {name: 'Add receiving account'}));
  fireEvent.change(screen.getByLabelText('Payment method'), {target: {value: 'cbe'}});
  expect(screen.getByRole('option', {name: /Commercial Bank of Ethiopia/})).toBeTruthy();
  expect(screen.getByRole('option', {name: /Telebirr/})).toBeTruthy();
  expect(screen.getByLabelText('Payment method')).toHaveProperty('value', 'cbe');
});

it('explains a platform verification pause without changing the approved account status', async () => {
  api.get.mockResolvedValue({data: {data: [{id: 1, provider: 'cbe', account_name: 'Owner', account_ending: '1234', status: 'approved', is_active: true, is_suspended: false, provider_registration_status: 'registered', checkout_eligible: false, checkout_blocker: 'verification_unavailable'}], available_methods: [{code: 'cbe', name: 'CBE'}]}});
  render(<Component />);
  expect(await screen.findByText('Payment verification is temporarily unavailable. Contact support for help.')).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Account actions'})).toBeTruthy();
  expect(screen.getByText('Approved')).toBeTruthy();
  expect(screen.getByText('Unavailable')).toBeTruthy();
});

it('connects Chapa on the receiving accounts page and switches the collector', async () => {
  api.get.mockImplementation((url: string) => {
    if (url === '/api/v1/storefront/chapa-gateway') {
      return Promise.resolve({data: {data: {
        collector: 'verify_et',
        has_secret: false,
        public_key_masked: null,
        chapa_checkout_available: false,
        pro: true,
      }}});
    }
    return Promise.resolve({data: {data: [], available_methods: [{code: 'cbe', name: 'Commercial Bank of Ethiopia'}]}});
  });
  api.put.mockImplementation((url: string) => {
    if (url === '/api/v1/storefront/chapa-gateway') {
      return Promise.resolve({data: {data: {
        collector: 'verify_et',
        has_secret: true,
        public_key_masked: '••••blic',
        chapa_checkout_available: false,
        pro: true,
      }}});
    }
    return Promise.resolve({data: {data: {
      collector: 'chapa',
      has_secret: true,
      public_key_masked: '••••blic',
      chapa_checkout_available: true,
      pro: true,
    }}});
  });
  render(<Component />);
  fireEvent.change(await screen.findByLabelText('Public key'), {target: {value: 'CHAPUBK-test-public'}});
  fireEvent.change(screen.getByLabelText('Secret key'), {target: {value: 'seller-secret'}});
  fireEvent.click(screen.getByRole('button', {name: 'Save Chapa keys'}));
  expect(await screen.findByText('••••blic')).toBeTruthy();
  expect(screen.getByText('A secret key is stored.')).toBeTruthy();
  expect(screen.getByLabelText('Secret key')).toHaveProperty('value', '');
  fireEvent.click(screen.getByRole('button', {name: 'Chapa'}));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith('/api/v1/storefront/payment-collector', {collector: 'chapa'}));
  expect(await screen.findByText('New checkouts use Chapa.')).toBeTruthy();
  expect(screen.queryByRole('option', {name: /Chapa/})).toBeNull();
});

it('hides Chapa keys and asks a free seller to upgrade when they choose Chapa', async () => {
  api.get.mockImplementation((url: string) => {
    if (url === '/api/v1/storefront/chapa-gateway') {
      return Promise.resolve({data: {data: {
        collector: 'verify_et',
        has_secret: false,
        public_key_masked: null,
        chapa_checkout_available: false,
        pro: false,
      }}});
    }
    return Promise.resolve({data: {data: [], available_methods: [{code: 'cbe', name: 'CBE'}]}});
  });
  render(<Component />);
  expect(await screen.findByRole('button', {name: 'Chapa'})).toBeTruthy();
  expect(screen.queryByLabelText('Public key')).toBeNull();
  expect(screen.queryByLabelText('Secret key')).toBeNull();
  expect(screen.queryByRole('button', {name: 'Save Chapa keys'})).toBeNull();
  expect(screen.queryByText('You need to upgrade to Pro to use Chapa.')).toBeNull();
  fireEvent.click(screen.getByRole('button', {name: 'Chapa'}));
  expect(await screen.findByText('You need to upgrade to Pro to use Chapa.')).toBeTruthy();
  expect(api.put).not.toHaveBeenCalled();
  expect(screen.getByRole('button', {name: 'Bank accounts'})).toHaveProperty('ariaPressed', 'true');
});

it('says Chapa checkout is paused when Pro is inactive and Chapa stays selected', async () => {
  api.get.mockImplementation((url: string) => {
    if (url === '/api/v1/storefront/chapa-gateway') {
      return Promise.resolve({data: {data: {
        collector: 'chapa',
        has_secret: true,
        public_key_masked: '••••blic',
        chapa_checkout_available: false,
        pro: false,
      }}});
    }
    return Promise.resolve({data: {data: [], available_methods: []}});
  });
  render(<Component />);
  expect(await screen.findByText('Chapa checkout is paused until Pro is active.')).toBeTruthy();
  expect(screen.queryByDisplayValue('seller-secret')).toBeNull();
  expect(screen.getByRole('button', {name: 'Bank accounts'})).toBeTruthy();
});

it('explains exhausted sales capacity without changing account approval', async () => {
  api.get.mockResolvedValue({data: {data: [{id: 1, provider: 'cbe', account_name: 'Owner', account_ending: '1234', status: 'approved', is_active: true, is_suspended: false, provider_registration_status: 'registered', checkout_eligible: false, checkout_blocker: 'verification_quota_exhausted'}], available_methods: [{code: 'cbe', name: 'CBE'}]}});
  render(<Component />);
  expect(await screen.findByText('You cannot accept additional verified sales right now. Upgrade to Pro to continue.')).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Account actions'})).toBeTruthy();
});

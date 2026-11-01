/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, expect, it, vi} from 'vitest';
import {Component} from './receiving-accounts-page';

const api = vi.hoisted(() => ({get: vi.fn(), post: vi.fn()}));
vi.mock('@common/http/query-client', () => ({apiClient: api}));
vi.mock('@ui/i18n/trans', () => ({Trans: ({message}: {message: string}) => message}));
vi.mock('@app/account-settings/account-settings-page-layout', () => ({AccountSettingsPageLayout: ({children}: {children: React.ReactNode}) => <main>{children}</main>}));
vi.mock('@shadcn/button/button', () => ({Button: 'button'}));
vi.mock('@shadcn/forms/input/input', () => ({Input: ({bindToHookForm: _ignored, ...props}: Record<string, unknown>) => <input {...props} />}));
vi.mock('@shadcn/spinner/spinner', () => ({Spinner: () => <span>Loading</span>}));
vi.mock('@shadcn/forms/select/select', () => ({Select: {Root: ({children, onValueChange}: {children: React.ReactNode; onValueChange: (value: string) => void}) => <select aria-label="Payment method" onChange={event => onValueChange(event.target.value)}>{children}</select>, Trigger: () => null, Value: () => null, Content: ({children}: {children: React.ReactNode}) => children, Group: ({children}: {children: React.ReactNode}) => children, Item: ({children, value}: {children: React.ReactNode; value: string}) => <option value={value}>{children}</option>}}));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

it('lists, creates, resubmits and changes activation through the page', async () => {
  const account = {id: 4, provider: 'telebirr', account_name: 'Test Owner', account_ending: '5678', status: 'approved', is_active: false, is_suspended: false, provider_registration_status: 'registered'};
  api.get.mockResolvedValue({data: {data: [account], available_methods: [{code: 'telebirr', name: 'Telebirr'}]}});
  api.post.mockResolvedValue({data: {}});
  render(<Component />);
  expect(await screen.findByText(/Test Owner/)).toBeTruthy();
  expect(screen.getByRole('img', {name: 'Telebirr'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button', {name: 'Add receiving account'}));
  fireEvent.change(screen.getByLabelText('Payment method'), {target: {value: 'telebirr'}});
  fireEvent.change(screen.getByLabelText('Account or wallet number'), {target: {value: '0912345678'}});
  fireEvent.change(screen.getByLabelText('Account holder name'), {target: {value: 'Test Owner'}});
  fireEvent.change(screen.getByLabelText('Ownership evidence'), {target: {files: [new File(['proof'], 'proof.pdf', {type: 'application/pdf'})]}});
  fireEvent.click(screen.getByRole('button', {name: 'Submit account for review'}));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/storefront/payment-methods', expect.any(FormData)));
  expect((api.post.mock.calls[0][1] as FormData).get('account_number')).toBe('0912345678');
  fireEvent.click(screen.getByRole('button', {name: 'Edit and resubmit'}));
  fireEvent.change(screen.getByLabelText('Account or wallet number'), {target: {value: '0912345679'}});
  fireEvent.change(screen.getByLabelText('Ownership evidence'), {target: {files: [new File(['proof'], 'proof.pdf', {type: 'application/pdf'})]}});
  fireEvent.click(screen.getByRole('button', {name: 'Submit account for review'}));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/storefront/payment-methods/4/resubmit', expect.any(FormData)));
  api.get.mockResolvedValue({data: {data: [{...account, is_active: true}], available_methods: [{code: 'telebirr', name: 'Telebirr'}]}});
  fireEvent.click(screen.getByRole('button', {name: 'Activate'}));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/v1/storefront/payment-methods/4/activate'));
  fireEvent.click(await screen.findByRole('button', {name: 'Deactivate'}));
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
  expect(screen.queryByRole('button', {name: 'Activate'})).toBeNull();
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
  expect(screen.getByRole('img', {name: 'Awash'})).toBeTruthy();
  expect(screen.queryByRole('button', {name: 'Activate'})).toBeNull();
  expect(screen.queryByRole('button', {name: 'Edit and resubmit'})).toBeNull();
});

it('shows checkout eligibility from the account API', async () => {
  api.get.mockResolvedValue({data: {data: [
    {id: 1, provider: 'cbe', account_name: 'Available Owner', account_ending: '1234', status: 'approved', is_active: true, is_suspended: false, provider_registration_status: 'registered', checkout_eligible: true},
    {id: 2, provider: 'cbe', account_name: 'Disabled Owner', account_ending: '5678', status: 'approved', is_active: true, is_suspended: false, provider_registration_status: 'registered', checkout_eligible: false},
  ], available_methods: [{code: 'cbe', name: 'CBE'}]}});
  render(<Component />);
  expect(await screen.findByText('Available at checkout')).toBeTruthy();
  expect(screen.getByText('Unavailable at checkout')).toBeTruthy();
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
  expect(screen.getByText('Approved and active')).toBeTruthy();
  expect(screen.getByText('Unavailable at checkout')).toBeTruthy();
});

it('explains exhausted sales capacity without changing account approval', async () => {
  api.get.mockResolvedValue({data: {data: [{id: 1, provider: 'cbe', account_name: 'Owner', account_ending: '1234', status: 'approved', is_active: true, is_suspended: false, provider_registration_status: 'registered', checkout_eligible: false, checkout_blocker: 'verification_quota_exhausted'}], available_methods: [{code: 'cbe', name: 'CBE'}]}});
  render(<Component />);
  expect(await screen.findByText('You cannot accept additional verified sales right now. Upgrade to Pro to continue.')).toBeTruthy();
  expect(screen.getByText('Approved and active')).toBeTruthy();
});

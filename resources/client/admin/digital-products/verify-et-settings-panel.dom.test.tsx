/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {VerifyEtSettingsPanel} from './verify-et-settings-panel';

const api = vi.hoisted(() => ({get: vi.fn(), patch: vi.fn()}));
vi.mock('@common/http/query-client', () => ({apiClient: api}));
vi.mock('@ui/i18n/trans', () => ({Trans: ({message}: {message: string}) => message}));
const settings = {enabled: false, api_key_configured: true, webhook_secret_configured: true, webhook_url: 'https://linket.example.test/billing/verify-et/webhook', alert_email: '', mock_enabled: false};
beforeEach(() => {
  api.get.mockResolvedValue({data: {data: {...settings}}});
  api.patch.mockResolvedValue({data: {data: {...settings}}});
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it('shows configured status without retrieving secrets and displays the receiver URL', async () => {
  render(<VerifyEtSettingsPanel />);
  expect(await screen.findByText('API key configured. Leave blank to keep it.')).toBeTruthy();
  expect((screen.getByLabelText('API key') as HTMLInputElement).value).toBe('');
  const url = screen.getByLabelText('Webhook URL') as HTMLInputElement;
  expect(url.value).toBe(settings.webhook_url);
  expect(url.readOnly).toBe(true);
});

it('preserves blank secrets and can pause verification', async () => {
  render(<VerifyEtSettingsPanel />);
  fireEvent.click(await screen.findByRole('button', {name: 'Save Verify.et settings'}));
  await screen.findByText('Verify.et settings saved.');
  expect(api.patch).toHaveBeenCalledWith('/api/v1/admin/storefront/verify-et-settings', {enabled: false, alert_email: null});
});

it('submits replacement credentials and clears both inputs after saving', async () => {
  render(<VerifyEtSettingsPanel />);
  const key = await screen.findByLabelText('API key');
  const secret = screen.getByLabelText('Webhook signing secret');
  fireEvent.change(key, {target: {value: 'synthetic-key'}});
  fireEvent.change(secret, {target: {value: 'whsec_synthetic'}});
  fireEvent.click(screen.getByRole('button', {name: 'Save Verify.et settings'}));
  await screen.findByText('Verify.et settings saved.');
  expect(api.patch).toHaveBeenCalledWith('/api/v1/admin/storefront/verify-et-settings', expect.objectContaining({api_key: 'synthetic-key', webhook_secret: 'whsec_synthetic'}));
  expect((key as HTMLInputElement).value).toBe('');
  expect((secret as HTMLInputElement).value).toBe('');
});

it('keeps unsaved fields when saving fails', async () => {
  api.patch.mockRejectedValue(new Error('Failed'));
  render(<VerifyEtSettingsPanel />);
  const key = await screen.findByLabelText('API key');
  fireEvent.change(key, {target: {value: 'synthetic-key'}});
  fireEvent.click(screen.getByRole('button', {name: 'Save Verify.et settings'}));
  await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
  expect((key as HTMLInputElement).value).toBe('synthetic-key');
  expect(screen.queryByText('Verify.et settings saved.')).toBeNull();
});

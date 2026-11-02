/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {Component} from './integrations-page';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('@common/http/query-client', () => ({apiClient: api}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => message,
}));
vi.mock('@app/account-settings/account-settings-page-layout', () => ({
  AccountSettingsPageLayout: ({children}: {children: React.ReactNode}) => (
    <main>{children}</main>
  ),
}));

const connected = {
  enabled: true,
  connected: true,
  username: 'creator_test',
  connected_at: '2026-11-02T01:00:00+00:00',
  last_seen_at: '2026-11-02T02:00:00+00:00',
  bot_username: 'LinketBot',
  notifications_enabled: true,
  preferences: {
    verified_sales: true,
    service_inquiries: true,
    product_moderation: true,
    payment_disputes: true,
    pro_billing: true,
    receiving_accounts: true,
    free_sales_quota: true,
    payment_review: true,
  },
};

beforeEach(() => {
  api.get.mockResolvedValue({data: {telegram: connected}});
  api.patch.mockResolvedValue({data: {telegram: connected}});
  api.post.mockResolvedValue({
    data: {
      telegram: {
        connect_url: 'https://t.me/LinketBot?start=opaque-token',
        expires_at: '2026-11-02T03:00:00+00:00',
      },
    },
  });
  api.delete.mockResolvedValue({data: {}});
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it('shows the connected Telegram integration and notification preferences', async () => {
  render(<Component />);

  expect(await screen.findByText('Telegram')).toBeTruthy();
  expect(screen.getByText('@creator_test')).toBeTruthy();
  expect(screen.getByLabelText('Verified sales').getAttribute('aria-checked')).toBe('true');
  expect(screen.getByLabelText('Service inquiries').getAttribute('aria-checked')).toBe('true');
  expect(screen.getByLabelText('Product moderation').getAttribute('aria-checked')).toBe('true');
  expect(screen.getByLabelText('Payment disputes').getAttribute('aria-checked')).toBe('true');
  expect(screen.getByLabelText('Pro billing reminders').getAttribute('aria-checked')).toBe('true');
  expect(screen.getByLabelText('Free sales allowance').getAttribute('aria-checked')).toBe('true');
  expect(screen.getByLabelText('Payment review').getAttribute('aria-checked')).toBe('true');

});

it('saves an event preference without disconnecting Telegram', async () => {
  render(<Component />);
  fireEvent.click(await screen.findByLabelText('Verified sales'));

  await waitFor(() =>
    expect(api.patch).toHaveBeenCalledWith(
      '/api/v1/integrations/telegram',
      expect.objectContaining({
        notifications_enabled: true,
        preferences: expect.objectContaining({verified_sales: false}),
      }),
    ),
  );
  expect(api.delete).not.toHaveBeenCalled();
});

it('lets creators mute payment-review Telegram alerts without disconnecting', async () => {
  render(<Component />);
  fireEvent.click(await screen.findByLabelText('Payment review'));

  await waitFor(() => expect(api.patch).toHaveBeenCalledWith(
    '/api/v1/integrations/telegram',
    expect.objectContaining({
      notifications_enabled: true,
      preferences: expect.objectContaining({payment_review: false}),
    }),
  ));
  expect(api.delete).not.toHaveBeenCalled();
});

it('confirms a Telegram test message without claiming preferences changed', async () => {
  render(<Component />);
  fireEvent.click(await screen.findByRole('button', {name: 'Send test'}));

  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith('/api/v1/integrations/telegram/test'),
  );
  expect(await screen.findByText('Test notification sent.')).toBeTruthy();
  expect(screen.queryByText('Telegram notification preferences updated.')).toBeNull();
});

it('starts the existing one-time Telegram connection flow when disconnected', async () => {
  api.get.mockResolvedValue({
    data: {
      telegram: {
        ...connected,
        connected: false,
        username: null,
      },
    },
  });
  const open = vi.spyOn(window, 'open').mockImplementation(() => null);

  render(<Component />);
  fireEvent.click(await screen.findByRole('button', {name: 'Connect Telegram'}));

  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith('/api/v1/integrations/telegram/connect'),
  );
  expect(open).toHaveBeenCalledWith(
    'https://t.me/LinketBot?start=opaque-token',
    '_blank',
    'noopener,noreferrer',
  );

  open.mockRestore();
});

it('shows unavailable configuration without offering connect', async () => {
  api.get.mockResolvedValue({
    data: {
      telegram: {
        ...connected,
        enabled: false,
        connected: false,
        username: null,
      },
    },
  });

  render(<Component />);

  expect(await screen.findByText('Telegram notifications are not available right now.')).toBeTruthy();
  expect(screen.queryByRole('button', {name: 'Connect Telegram'})).toBeNull();
});

it('shows the latest delivery status and recovery guidance after a failed delivery', async () => {
  api.get.mockResolvedValue({data: {telegram: {
    ...connected,
    delivery_status: 'attention_required',
    last_delivery_at: '2026-11-02T01:00:00+00:00',
    last_failed_at: '2026-11-02T02:00:00+00:00',
  }}});
  render(<Component />);

  expect(await screen.findByText('Delivery needs attention')).toBeTruthy();
  expect(screen.getByText('Last successful delivery')).toBeTruthy();
  expect(screen.getByText('Last failed delivery')).toBeTruthy();
  expect(screen.getByText('Open your bot chat, unblock the bot if needed, and send a test.')).toBeTruthy();
});

it('does not call an untested connection healthy', async () => {
  api.get.mockResolvedValue({data: {telegram: {
    ...connected, delivery_status: 'unknown', last_delivery_at: null, last_failed_at: null,
  }}});
  render(<Component />);

  expect(await screen.findByText('No delivery recorded yet')).toBeTruthy();
  expect(screen.getByText('Send a test to check that Telegram can receive messages.')).toBeTruthy();
});

it('refreshes delivery status after sending a test', async () => {
  api.get.mockResolvedValueOnce({data: {telegram: {...connected, delivery_status: 'unknown'}}})
    .mockResolvedValueOnce({data: {telegram: {...connected, delivery_status: 'healthy', last_delivery_at: '2026-11-02T02:00:00+00:00'}}});
  render(<Component />);
  fireEvent.click(await screen.findByRole('button', {name: 'Send test'}));

  expect(await screen.findByText('Delivery working')).toBeTruthy();
  expect(api.get).toHaveBeenCalledTimes(2);
});

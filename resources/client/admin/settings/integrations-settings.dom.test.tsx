/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, expect, it, vi} from 'vitest';
import {Component} from './integrations-settings';

const api = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('@common/http/query-client', () => ({apiClient: api}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => message,
}));
vi.mock('@common/ui/dashboard/dashboard-layout', () => ({
  DashboardLayout: {
    MainSection: 'main',
    SectionHeader: 'header',
    SidebarToggle: 'span',
    SectionTitle: 'h1',
  },
}));
vi.mock('@common/admin/settings/layout/settings-panel', () => ({
  SettingsPanel: ({
    children,
    title,
    description,
  }: {
    children: React.ReactNode;
    title: React.ReactNode;
    description?: React.ReactNode;
  }) => (
    <section>
      <h2>{title}</h2>
      <div>{description}</div>
      {children}
    </section>
  ),
}));

const health = {
  enabled: true,
  ready: true,
  bot_token_configured: true,
  webhook_secret_configured: true,
  bot_username: 'LinketBot',
  webhook_url: 'https://linket.example.test/integrations/telegram/webhook',
  connected_accounts: 12,
  notification_enabled_accounts: 10,
  link_token_ttl_minutes: 10,
  http_timeout: 10,
  http_connect_timeout: 5,
  current_admin_connected: true,
};

beforeEach(() => {
  api.get.mockResolvedValue({data: {telegram: health}});
  api.post.mockResolvedValue({
    data: {
      telegram: {
        ...health,
        webhook: {
          url: health.webhook_url,
          pending_update_count: 0,
          allowed_updates: ['message'],
        },
      },
    },
  });
});

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

it('shows safe Telegram readiness without rendering environment secrets', async () => {
  render(<Component />);

  expect(await screen.findByText('Telegram')).toBeTruthy();
  expect(screen.getByText('Ready')).toBeTruthy();
  expect(screen.getByText('@LinketBot')).toBeTruthy();
  expect(screen.getByDisplayValue(health.webhook_url)).toHaveProperty('readOnly', true);
  expect(screen.queryByDisplayValue('synthetic-bot-token')).toBeNull();
  expect(screen.queryByDisplayValue('synthetic-webhook-secret')).toBeNull();
});

it('explains missing server configuration and disables operational actions', async () => {
  api.get.mockResolvedValue({
    data: {
      telegram: {
        ...health,
        ready: false,
        bot_token_configured: false,
        webhook_secret_configured: false,
      },
    },
  });

  render(<Component />);

  expect(await screen.findByText('Server configuration required')).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Sync webhook'})).toHaveProperty('disabled', true);
  expect(screen.getByRole('button', {name: 'Send test notification'})).toHaveProperty('disabled', true);
});

it('checks remote bot health without modifying the webhook', async () => {
  api.get.mockImplementation((url: string) => Promise.resolve({
    data: {telegram: url.endsWith('/health') ? {
      ...health,
      status: 'degraded',
      bot: {id: 12345, username: 'OtherBot', identity_matches: false},
      webhook: {url: 'https://wrong.example.test/webhook', pending_update_count: 2, allowed_updates: ['message'], url_matches: false},
    } : health},
  }));

  render(<Component />);
  fireEvent.click(await screen.findByRole('button', {name: 'Check Telegram health'}));

  await waitFor(() => expect(api.get).toHaveBeenCalledWith('/api/v1/admin/integrations/telegram/health'));
  expect(await screen.findByText('Bot identity mismatch')).toBeTruthy();
  expect(screen.getByText('Remote webhook URL mismatch')).toBeTruthy();
  expect(api.post).not.toHaveBeenCalled();
});

it('syncs the webhook and displays the safe remote status', async () => {
  render(<Component />);
  fireEvent.click(await screen.findByRole('button', {name: 'Sync webhook'}));

  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      '/api/v1/admin/integrations/telegram/webhook/sync',
    ),
  );
  expect(await screen.findByText('Webhook synced')).toBeTruthy();
  expect(screen.getByText('0 pending updates')).toBeTruthy();
});

it('sends a test only when the current admin has Telegram connected', async () => {
  render(<Component />);
  fireEvent.click(
    await screen.findByRole('button', {name: 'Send test notification'}),
  );

  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith('/api/v1/admin/integrations/telegram/test'),
  );
  expect(await screen.findByText('Test notification sent.')).toBeTruthy();
});

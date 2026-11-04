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
vi.mock('@ui/i18n/formatted-date', () => ({
  FormattedDate: ({date}: {date: string}) => <time>{date}</time>,
}));
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

  expect(await screen.findByText('Last recorded delivery succeeded')).toBeTruthy();
  expect(api.get).toHaveBeenCalledTimes(2);
});

it('refreshes delivery status after a failed test without hiding the error', async () => {
  api.get.mockResolvedValueOnce({data: {telegram: {...connected, delivery_status: 'healthy'}}})
    .mockResolvedValueOnce({data: {telegram: {...connected, delivery_status: 'attention_required'}}});
  api.post.mockRejectedValueOnce(new Error('delivery failed'));
  render(<Component />);
  fireEvent.click(await screen.findByRole('button', {name: 'Send test'}));

  expect(await screen.findByText('Delivery needs attention')).toBeTruthy();
  expect(screen.getByText('Could not confirm the test was sent. Refresh to update delivery status.')).toBeTruthy();
});

it('explains when a sent test could not refresh the delivery status', async () => {
  api.get.mockResolvedValueOnce({data: {telegram: connected}})
    .mockRejectedValueOnce(new Error('refresh failed'));
  render(<Component />);
  fireEvent.click(await screen.findByRole('button', {name: 'Send test'}));

  expect(await screen.findByText('Test sent, but delivery status could not be refreshed.')).toBeTruthy();
});


const chatGptConnection = {
  id: '11111111-2222-4333-8444-555555555555',
  workspace_id: 42,
  client_id: 'chatgpt-oauth-client',
  status: 'active',
  consented_at: '2026-11-04T09:00:00+00:00',
  expires_at: '2026-12-04T09:00:00+00:00',
  revoked_at: null,
  last_accessed_at: null,
};

it('shows ChatGPT connection availability without offering an unimplemented OAuth shortcut', async () => {
  api.get.mockImplementation(async (url: string) => {
    if (url === '/api/v1/integrations/telegram') return {data: {telegram: connected}};
    if (url === '/api/v1/creator-ai/mcp-connections') {
      return {data: {data: {connections: [], oauth_connection_available: false}}};
    }
    throw new Error('Unexpected API endpoint');
  });

  render(<Component />);

  expect(await screen.findByText('ChatGPT')).toBeTruthy();
  expect(screen.getByText('New ChatGPT connections are not available yet.')).toBeTruthy();
  expect(screen.getByText('No ChatGPT connections yet.')).toBeTruthy();
  expect(screen.queryByRole('button', {name: 'Connect ChatGPT'})).toBeNull();
});

it('shows the creator-owned ChatGPT consent grant and revokes it only after confirmation', async () => {
  let connections = [chatGptConnection];
  api.get.mockImplementation(async (url: string) => {
    if (url === '/api/v1/integrations/telegram') return {data: {telegram: connected}};
    if (url === '/api/v1/creator-ai/mcp-connections') {
      return {data: {data: {connections, oauth_connection_available: false}}};
    }
    throw new Error('Unexpected API endpoint');
  });
  api.delete.mockImplementation(async (url: string) => {
    if (url !== '/api/v1/creator-ai/mcp-connections/' + chatGptConnection.id) {
      throw new Error('Unexpected revoke target');
    }
    connections = [{...chatGptConnection, status: 'revoked'}];
    return {data: {}};
  });

  render(<Component />);

  expect(await screen.findByText('chatgpt-oauth-client')).toBeTruthy();
  expect(screen.getByText('Workspace #42')).toBeTruthy();
  expect(screen.getByText('Active')).toBeTruthy();

  fireEvent.click(screen.getByRole('button', {name: 'Disconnect ChatGPT connection'}));
  expect(api.delete).not.toHaveBeenCalled();
  fireEvent.click(await screen.findByRole('button', {name: 'Disconnect connection'}));

  await waitFor(() => expect(api.delete).toHaveBeenCalledWith(
    '/api/v1/creator-ai/mcp-connections/' + chatGptConnection.id,
  ));
  expect(await screen.findByText('Revoked')).toBeTruthy();
  expect(screen.queryByRole('button', {name: 'Disconnect ChatGPT connection'})).toBeNull();
  expect(screen.getByText('ChatGPT connection disconnected.')).toBeTruthy();
});

it('shows a retry state for ChatGPT API errors without hiding Telegram settings', async () => {
  api.get.mockImplementation(async (url: string) => {
    if (url === '/api/v1/integrations/telegram') return {data: {telegram: connected}};
    if (url === '/api/v1/creator-ai/mcp-connections') throw new Error('Unavailable');
    throw new Error('Unexpected API endpoint');
  });

  render(<Component />);

  expect(await screen.findByText('Unable to load ChatGPT connections.')).toBeTruthy();
  expect(screen.getByText('@creator_test')).toBeTruthy();
  expect(screen.getByRole('button', {name: 'Retry ChatGPT connections'})).toBeTruthy();
});


it('explains verified Pro eligibility without exposing the MCP URL to ineligible creators', async () => {
  api.get.mockImplementation(async (url: string) => {
    if (url === '/api/v1/integrations/telegram') return {data: {telegram: connected}};
    if (url === '/api/v1/creator-ai/mcp-connections') {
      return {data: {data: {
        connections: [],
        oauth_connection_available: false,
        connection_setup: {status: 'verified_pro_required', resource_url: null},
      }}};
    }
    throw new Error('Unexpected endpoint');
  });

  render(<Component />);

  expect(await screen.findByText('Verified Linket Pro is required to connect ChatGPT.')).toBeTruthy();
  expect(screen.queryByText('New ChatGPT connections are not available yet.')).toBeNull();
  expect(screen.queryByText('https://linket.example.test/mcp')).toBeNull();
});

it('shows the approved MCP URL and consent steps only when the creator is eligible', async () => {
  api.get.mockImplementation(async (url: string) => {
    if (url === '/api/v1/integrations/telegram') return {data: {telegram: connected}};
    if (url === '/api/v1/creator-ai/mcp-connections') {
      return {data: {data: {
        connections: [],
        oauth_connection_available: true,
        connection_setup: {status: 'ready', resource_url: 'https://linket.example.test/mcp'},
      }}};
    }
    throw new Error('Unexpected endpoint');
  });

  render(<Component />);

  expect(await screen.findByText('https://linket.example.test/mcp')).toBeTruthy();
  expect(screen.getByText('Connect from ChatGPT')).toBeTruthy();
  expect(screen.getByText('Approve access to the workspace you select in Linket.')).toBeTruthy();
  expect(screen.queryByRole('button', {name: 'Connect ChatGPT'})).toBeNull();
});

it('explains when an eligible Pro creator has no workspace available', async () => {
  api.get.mockImplementation(async (url: string) => {
    if (url === '/api/v1/integrations/telegram') return {data: {telegram: connected}};
    if (url === '/api/v1/creator-ai/mcp-connections') {
      return {data: {data: {
        connections: [],
        oauth_connection_available: false,
        connection_setup: {status: 'workspace_required', resource_url: null},
      }}};
    }
    throw new Error('Unexpected endpoint');
  });

  render(<Component />);
  expect(await screen.findByText('Create or join a Linket workspace before connecting ChatGPT.')).toBeTruthy();
});

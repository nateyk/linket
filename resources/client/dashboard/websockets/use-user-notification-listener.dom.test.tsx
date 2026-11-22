/**
 * @vitest-environment jsdom
 */
import {render} from '@testing-library/react';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';

const {
  leave,
  invalidateQueries,
  toast,
  mergeBootstrapData,
  getBootstrapData,
  echo,
  handlers,
} = vi.hoisted(() => {
  const leaveFn = vi.fn();
  const handlersList: Array<(payload: unknown) => void> = [];
  const privateChannelObj = {
    notification: (handler: (payload: unknown) => void) => {
      handlersList.push(handler);
      return privateChannelObj;
    },
  };
  const echoObj = {
    private: vi.fn(() => privateChannelObj),
    leave: leaveFn,
  };

  return {
    leave: leaveFn,
    invalidateQueries: vi.fn(),
    toast: vi.fn(),
    mergeBootstrapData: vi.fn(),
    getBootstrapData: vi.fn(),
    echo: echoObj,
    handlers: handlersList,
  };
});

vi.mock('@common/auth/use-auth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@ui/settings/use-settings', () => ({
  useSettings: vi.fn(),
}));

vi.mock('@app/dashboard/websockets/boot-echo', () => ({
  bootEcho: vi.fn(async () => echo),
}));

vi.mock('@common/http/query-client', () => ({
  queryClient: {invalidateQueries},
}));

vi.mock('@common/notifications/notifications-queries', () => ({
  notificationsBaseKey: ['notifications'],
}));

vi.mock('@shadcn/toast/toast', () => ({
  toast: (...args: unknown[]) => toast(...args),
}));

vi.mock('@ui/bootstrap-data/bootstrap-data-store', () => ({
  getBootstrapData: () => getBootstrapData(),
  mergeBootstrapData: (...args: unknown[]) => mergeBootstrapData(...args),
}));

import {useAuth} from '@common/auth/use-auth';
import {useSettings} from '@ui/settings/use-settings';
import {bootEcho} from '@app/dashboard/websockets/boot-echo';
import {useUserNotificationListener} from './use-user-notification-listener';

function Harness() {
  useUserNotificationListener();
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
  handlers.length = 0;
  getBootstrapData.mockReturnValue({
    user: {id: 7, unread_notifications_count: 2},
  });
});

afterEach(() => {
  vi.clearAllMocks();
  handlers.length = 0;
});

test('does not boot Echo when notifications or websockets are disabled', () => {
  vi.mocked(useAuth).mockReturnValue({
    isLoggedIn: true,
    user: {id: 7},
  } as any);
  vi.mocked(useSettings).mockReturnValue({
    notifications: {integrated: false},
    websockets: {integrated: true},
    broadcasting: {driver: 'reverb'},
  } as any);

  render(<Harness />);

  expect(bootEcho).not.toHaveBeenCalled();
});

test('subscribes to App.User.{id}, invalidates inbox, bumps unread, and toasts preview', async () => {
  vi.mocked(useAuth).mockReturnValue({
    isLoggedIn: true,
    user: {id: 7},
  } as any);
  vi.mocked(useSettings).mockReturnValue({
    notifications: {integrated: true},
    websockets: {integrated: true},
    broadcasting: {driver: 'reverb'},
  } as any);

  const {unmount} = render(<Harness />);

  await vi.waitFor(() => {
    expect(echo.private).toHaveBeenCalledWith('App.User.7');
  });

  await vi.waitFor(() => {
    expect(handlers.length).toBeGreaterThan(0);
  });
  handlers.at(-1)!({
    lines: [{content: '<b>Payout approved</b>'}],
  });

  expect(invalidateQueries).toHaveBeenCalledWith({
    queryKey: ['notifications'],
  });
  expect(mergeBootstrapData).toHaveBeenCalledWith({
    user: expect.objectContaining({
      id: 7,
      unread_notifications_count: 3,
    }),
  });
  expect(toast).toHaveBeenCalledWith('Payout approved');

  unmount();
  await vi.waitFor(() => {
    expect(leave).toHaveBeenCalledWith('App.User.7');
  });
});

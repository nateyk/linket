/**
 * @vitest-environment jsdom
 */
import {render, screen} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {beforeEach, expect, test, vi} from 'vitest';
import {ColorSchemeContext} from '@common/core/color-scheme-provider';

const useSettingsMock = vi.fn(() => ({
  themes: {user_change: true},
}));

vi.mock('@ui/settings/use-settings', () => ({
  useSettings: () => useSettingsMock(),
}));

import {NavbarColorSchemeToggle} from './navbar-color-scheme-toggle';

beforeEach(() => {
  useSettingsMock.mockReturnValue({themes: {user_change: true}});
});

test('toggles between light and dark mode when clicked', async () => {
  const setColorScheme = vi.fn();
  const user = userEvent.setup();

  render(
    <ColorSchemeContext.Provider
      value={{colorScheme: 'light', setColorScheme}}
    >
      <NavbarColorSchemeToggle />
    </ColorSchemeContext.Provider>,
  );

  await user.click(
    screen.getByRole('button', {name: 'Switch to dark mode'}),
  );

  expect(setColorScheme).toHaveBeenCalledWith('dark');
});

test('hides when users cannot change color scheme', () => {
  useSettingsMock.mockReturnValue({themes: {user_change: false}});

  const {container} = render(
    <ColorSchemeContext.Provider
      value={{colorScheme: 'light', setColorScheme: () => {}}}
    >
      <NavbarColorSchemeToggle />
    </ColorSchemeContext.Provider>,
  );

  expect(container.firstChild).toBeNull();
});

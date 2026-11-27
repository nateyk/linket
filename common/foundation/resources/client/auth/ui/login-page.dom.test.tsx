/** @vitest-environment jsdom */
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, expect, test, vi} from 'vitest';
import {LoginPage} from './login-page';

vi.mock('@ui/settings/use-settings', () => ({
  useSettings: () => ({
    branding: {site_name: 'Linket', logo_light: '/light.svg', logo_dark: '/dark.svg'},
    registration: {disable: false},
    site: {demo: false},
    social: {
      google: {enable: true},
      compact_buttons: false,
    },
  }),
}));

vi.mock('@common/locale-switcher/locale-switcher', () => ({
  LocaleSwitcher: () => <button type="button">Choose language</button>,
}));

vi.mock('../requests/use-login', () => ({
  useLogin: () => ({
    isPending: false,
    mutate: vi.fn(),
  }),
}));

vi.mock('@common/auth/use-auth', () => ({
  useAuth: () => ({
    user: null,
    isLoggedIn: false,
    getRedirectUri: () => '/dashboard',
  }),
}));

beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderLogin() {
  const client = new QueryClient({
    defaultOptions: {queries: {retry: false}, mutations: {retry: false}},
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/login']}>
        <LoginPage onTwoFactorChallenge={() => {}} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

test('renders clean typography, signup link below title, and balanced remember/forgot row', () => {
  const {container} = renderLogin();

  const heading = screen.getByRole('heading', {name: 'Login to your account'});
  expect(heading.className).toContain('font-bold');
  expect(screen.queryByText('Please enter your details to login.')).toBeNull();
  expect(screen.getByText(/Don't have an account\?/)).toBeTruthy();
  expect(screen.getByRole('link', {name: 'Sign up'}).getAttribute('href')).toBe('/register');
  expect(screen.getByRole('checkbox', {name: 'Remember me'})).toBeTruthy();
  expect(screen.queryByText('Remember me for 30 days')).toBeNull();
  expect(screen.getByRole('link', {name: 'Forgot password?'}).getAttribute('href')).toBe('/forgot-password');

  // AuthLayoutV2 enforces vertical gap between header, form, and footer content
  const formWrapper = container.querySelector('.max-w-sm');
  expect(formWrapper?.className).toContain('flex');
  expect(formWrapper?.className).toContain('gap-6');
});

test('password field includes an accessible show/hide visibility toggle', () => {
  renderLogin();

  const passwordInput = screen.getByLabelText('Password') as HTMLInputElement;
  expect(passwordInput.type).toBe('password');

  const toggle = screen.getByRole('button', {name: 'Show password'});
  expect(toggle.getAttribute('aria-pressed')).toBe('false');

  fireEvent.click(toggle);
  expect(passwordInput.type).toBe('text');
  expect(screen.getByRole('button', {name: 'Hide password'}).getAttribute('aria-pressed')).toBe('true');

  fireEvent.click(screen.getByRole('button', {name: 'Hide password'}));
  expect(passwordInput.type).toBe('password');
});

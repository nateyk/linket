/** @vitest-environment jsdom */
import {apiClient} from '@common/http/query-client';
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';
import {RecoveryRequest} from './portal-recovery';

const mockNavigate = vi.fn();

vi.mock('react-router', async importOriginal => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@common/http/query-client', () => ({
  apiClient: {post: vi.fn()},
}));

vi.mock('@ui/settings/use-settings', () => ({
  useSettings: () => ({
    branding: {site_name: 'Linket', logo_light: '/light.svg', logo_dark: '/dark.svg'},
    registration: {disable: false},
    site: {demo: false},
    social: {},
  }),
}));

vi.mock('@common/locale-switcher/locale-switcher', () => ({
  LocaleSwitcher: () => <button type="button">Choose language</button>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('RecoveryRequest and PurchaseCodeInput DOM', () => {
  test('validates email, renders 6 OTP slots, filters non-digits, and verifies code', async () => {
    vi.mocked(apiClient.post).mockResolvedValue({data: {}});

    render(
      <MemoryRouter>
        <RecoveryRequest />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: {value: 'invalid-email'},
    });
    fireEvent.submit(
      screen.getByRole('button', {name: 'Email me a sign-in code'}).closest('form')!,
    );
    expect(screen.getByText('Enter a valid email address.')).toBeTruthy();

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: {value: 'buyer@example.com'},
    });
    fireEvent.submit(
      screen.getByRole('button', {name: 'Email me a sign-in code'}).closest('form')!,
    );

    expect(await screen.findByText('Check your inbox')).toBeTruthy();
    const slots = screen.getAllByTestId('purchase-otp-slot');
    expect(slots).toHaveLength(6);

    const codeInput = screen.getByLabelText('Sign-in code') as HTMLInputElement;
    expect(screen.getByRole('button', {name: 'Verify code'})).toHaveProperty(
      'disabled',
      true,
    );

    fireEvent.change(codeInput, {target: {value: '12a34b56c'}});
    expect(codeInput.value).toBe('123456');
    expect(slots[0].textContent).toBe('1');
    expect(slots[5].textContent).toBe('6');
    expect(screen.getByRole('button', {name: 'Verify code'})).toHaveProperty(
      'disabled',
      false,
    );

    fireEvent.click(screen.getByRole('button', {name: 'Verify code'}));
    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/public/my-portal/verify-code',
        {email: 'buyer@example.com', code: '123456'},
      );
      expect(mockNavigate).toHaveBeenCalledWith('/my-portal');
    });
  });

  test('shows error alert when verification fails and allows changing email', async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({data: {}})
      .mockRejectedValueOnce(new Error('expired'));

    render(
      <MemoryRouter>
        <RecoveryRequest />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText('Email address'), {
      target: {value: 'buyer@example.com'},
    });
    fireEvent.click(screen.getByRole('button', {name: 'Email me a sign-in code'}));

    const codeInput = await screen.findByLabelText('Sign-in code');
    fireEvent.change(codeInput, {target: {value: '654321'}});
    fireEvent.click(screen.getByRole('button', {name: 'Verify code'}));

    expect(
      await screen.findByText('That sign-in code is invalid or has expired.'),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', {name: 'Change'}));
    expect(screen.getByLabelText('Email address')).toBeTruthy();
  });
});

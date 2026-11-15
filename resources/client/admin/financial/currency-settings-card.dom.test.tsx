/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {CurrencySettingsCard} from './currency-settings-card';

const mockMutate = vi.fn();
const mockAdminSettings = {
  client: {
    billing: {
      currency: 'ETB',
      currency_symbol: 'Br',
      currency_symbol_position: 'after',
    },
  },
};

vi.mock('@tanstack/react-query', async importOriginal => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    useQuery: () => ({
      data: mockAdminSettings,
      isLoading: false,
    }),
    useMutation: () => ({
      mutate: mockMutate,
      isPending: false,
    }),
  };
});

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <span>{message}</span>,
}));

vi.mock('@shadcn/toast/toast', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@ui/bootstrap-data/bootstrap-data-store', () => ({
  getBootstrapData: () => ({
    settings: {
      billing: {
        currency: 'ETB',
        currency_symbol: 'Br',
        currency_symbol_position: 'after',
      },
    },
  }),
  setBootstrapData: vi.fn(),
}));

describe('CurrencySettingsCard', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('renders currency defaults with current values and live preview', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CurrencySettingsCard />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Default Currency & Formatting')).toBeTruthy();
    expect(screen.getByDisplayValue('ETB')).toBeTruthy();
    expect(screen.getByDisplayValue('Br')).toBeTruthy();
    expect(screen.getByText('250.00 Br')).toBeTruthy();
  });

  it('updates live formatted preview when currency symbol changes', () => {
    render(
      <QueryClientProvider client={queryClient}>
        <CurrencySettingsCard />
      </QueryClientProvider>,
    );

    const symbolInput = screen.getByDisplayValue('Br');
    fireEvent.change(symbolInput, {target: {value: '$'}});

    expect(screen.getByText('250.00 $')).toBeTruthy();
  });

  it('submits updated currency defaults on form submit', async () => {
    mockMutate.mockImplementation((payload: any, options: any) => {
      options?.onSuccess?.();
    });

    render(
      <QueryClientProvider client={queryClient}>
        <CurrencySettingsCard />
      </QueryClientProvider>,
    );

    const codeInput = screen.getByDisplayValue('ETB');
    fireEvent.change(codeInput, {target: {value: 'USD'}});

    const symbolInput = screen.getByDisplayValue('Br');
    fireEvent.change(symbolInput, {target: {value: '$'}});

    const saveButton = screen.getByRole('button', {name: /Save currency defaults/i});
    fireEvent.click(saveButton);

    expect(mockMutate).toHaveBeenCalledTimes(1);
    const submittedPayload = mockMutate.mock.calls[0][0];
    expect(submittedPayload.client.billing.currency).toBe('USD');
    expect(submittedPayload.client.billing.currency_symbol).toBe('$');

    await waitFor(() => {
      expect(screen.getByText('Site currency defaults updated successfully.')).toBeTruthy();
    });
  });
});

/** @vitest-environment jsdom */
import {act, cleanup, render, screen, waitFor} from '@testing-library/react';
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {afterEach, expect, it, vi} from 'vitest';
import {CreatorSetupChecklist} from './creator-setup-checklist';

const api = vi.hoisted(() => ({get: vi.fn()}));
vi.mock('@common/http/query-client', () => ({apiClient: api}));
vi.mock('@ui/i18n/trans', () => ({Trans: ({message, values}: {message: string; values?: Record<string, string | number>}) => Object.entries(values ?? {}).reduce((text, [key, value]) => text.replace(`:${key}`, String(value)), message)}));
vi.mock('@shadcn/skeleton/skeleton', () => ({Skeleton: 'div'}));
vi.mock('@shadcn/toast/toast', () => ({toast: {success: vi.fn(), warning: vi.fn()}}));
vi.mock('@ui/utils/hooks/use-clipboard', () => ({default: () => [false, vi.fn()]}));
vi.mock('react-router', () => ({Link: ({to, ...props}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {to: string}) => <a href={to} {...props} />}));
afterEach(() => {cleanup(); vi.clearAllMocks();});


it('derives setup completion from stores, product files, and usable receiving accounts', async () => {
  api.get.mockImplementation((url: string) => {
    if (url === '/api/v1/stores') return Promise.resolve({data: {data: [{id: 9}]}});
    if (url === '/api/v1/storefront/products') return Promise.resolve({data: {data: [{id: 22, status: 'pending_approval', files: [{id: 1}], biolink_ids: [], sales_count: 0}]}});
    if (url === '/api/v1/storefront/payment-methods') return Promise.resolve({data: {data: [{checkout_eligible: true}]}});
    throw new Error(`Unexpected URL: ${url}`);
  });
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  render(<QueryClientProvider client={client}><CreatorSetupChecklist /></QueryClientProvider>);

  expect(await screen.findByText('4 of 7 setup steps complete')).toBeTruthy();
  expect(screen.getByText('57%')).toBeTruthy();

  expect(screen.getByText('Create storefront')).toBeTruthy();
  expect(screen.getByText('Add digital product')).toBeTruthy();
  expect(screen.getByText('Upload product file')).toBeTruthy();
  expect(screen.getByText('Configure receiving account')).toBeTruthy();
  expect(screen.getByText('Get product approved')).toBeTruthy();
  expect(screen.getByText('Publish product in storefront')).toBeTruthy();
  expect(screen.getByText('Make your first sale')).toBeTruthy();
  expect(screen.getByText('Up next')).toBeTruthy();
  expect(screen.getByRole('link', {name: /Continue setup/i}).getAttribute('href')).toBe('/dashboard/items/22/edit');
  expect(screen.getByRole('link', {name: 'Publish product in storefront'}).getAttribute('href')).toBe('/dashboard/items/22/edit');
});


it('does not count an approved course as published until its lessons are published', async () => {
  const product = {id: 22, status: 'approved', is_course: true, files: [], biolink_ids: [9], sales_count: 0, course: {published_at: null as string | null}};
  api.get.mockImplementation((url: string) => {
    if (url === '/api/v1/stores') return Promise.resolve({data: {data: [{id: 9}]}});
    if (url === '/api/v1/storefront/products') return Promise.resolve({data: {data: [structuredClone(product)]}});
    if (url === '/api/v1/storefront/payment-methods') return Promise.resolve({data: {data: [{checkout_eligible: true}]}});
    throw new Error(`Unexpected URL: ${url}`);
  });
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  render(<QueryClientProvider client={client}><CreatorSetupChecklist /></QueryClientProvider>);

  expect(await screen.findByText('4 of 7 setup steps complete')).toBeTruthy();
  expect(screen.getByRole('link', {name: /Continue setup/i}).getAttribute('href')).toBe('/dashboard/items/22/edit');

  product.course.published_at = '2026-10-30T00:00:00Z';
  await act(() => client.invalidateQueries({queryKey: ['creator-setup-checklist']}));

  await waitFor(() => expect(screen.getByText('5 of 7 setup steps complete')).toBeTruthy());
  expect(screen.queryByRole('link', {name: 'Publish product in storefront'})).toBeNull();
  expect(screen.getByText('Up next')).toBeTruthy();
  expect(screen.getByText('Upload product file')).toBeTruthy();
  expect(screen.getByRole('link', {name: /Continue setup/i}).getAttribute('href')).toBe(
    '/dashboard/items/22/edit',
  );
});



it('shows all setup progress complete when the creator API reports an approved placed product with a sale', async () => {
  api.get.mockImplementation((url: string) => {
    if (url === '/api/v1/stores') return Promise.resolve({data: {data: [{id: 9}]}});
    if (url === '/api/v1/storefront/products') return Promise.resolve({data: {data: [{
      id: 22,
      status: 'approved',
      files: [{id: 1}],
      biolink_ids: [9],
      sales_count: 1,
    }]}});
    if (url === '/api/v1/storefront/payment-methods') return Promise.resolve({data: {data: [{checkout_eligible: true}]}});
    throw new Error(`Unexpected URL: ${url}`);
  });
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  render(<QueryClientProvider client={client}><CreatorSetupChecklist /></QueryClientProvider>);

  expect(await screen.findByText('7 of 7 setup steps complete')).toBeTruthy();
  expect(screen.queryByRole('link', {name: 'Get product approved'})).toBeNull();
  expect(screen.queryByRole('link', {name: 'Publish product in storefront'})).toBeNull();
  expect(screen.queryByRole('link', {name: 'Make your first sale'})).toBeNull();
});

it('refreshes progress when returning to the dashboard after completing a setup step', async () => {
  let stores: Array<{id: number}> = [];
  api.get.mockImplementation((url: string) => {
    if (url === '/api/v1/stores') return Promise.resolve({data: {data: stores}});
    if (url === '/api/v1/storefront/products' || url === '/api/v1/storefront/payment-methods') return Promise.resolve({data: {data: []}});
    throw new Error(`Unexpected URL: ${url}`);
  });
  const client = new QueryClient({defaultOptions: {queries: {retry: false, staleTime: 30000}}});
  const dashboard = () => <QueryClientProvider client={client}><CreatorSetupChecklist /></QueryClientProvider>;
  const page = render(dashboard());
  expect(await screen.findByText('0 of 7 setup steps complete')).toBeTruthy();
  expect(screen.getByRole('link', {name: /Continue setup/i}).getAttribute('href')).toBe('/dashboard/stores');

  page.unmount();
  stores = [{id: 9}];
  render(dashboard());
  expect(await screen.findByText('1 of 7 setup steps complete')).toBeTruthy();
  expect(screen.queryByRole('link', {name: 'Create storefront'})).toBeNull();
  expect(screen.getByRole('link', {name: /Continue setup/i}).getAttribute('href')).toBe('/dashboard/items/new');
});


it('refreshes approval and first sale while the dashboard stays open', async () => {
  const product = {id: 22, status: 'pending_approval', files: [{id: 1}], biolink_ids: [9], sales_count: 0};
  api.get.mockImplementation((url: string) => {
    if (url === '/api/v1/stores') return Promise.resolve({data: {data: [{id: 9}]}});
    if (url === '/api/v1/storefront/products') return Promise.resolve({data: {data: [structuredClone(product)]}});
    if (url === '/api/v1/storefront/payment-methods') return Promise.resolve({data: {data: [{checkout_eligible: true}]}});
    throw new Error(`Unexpected URL: ${url}`);
  });
  vi.useFakeTimers();
  try {
    const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
    render(<QueryClientProvider client={client}><CreatorSetupChecklist /></QueryClientProvider>);
    await act(async () => { await vi.advanceTimersByTimeAsync(10); });
    expect(screen.getByText('4 of 7 setup steps complete')).toBeTruthy();
    product.status = 'approved';
    await act(async () => { await vi.advanceTimersByTimeAsync(30010); });
    expect(screen.getByText('6 of 7 setup steps complete')).toBeTruthy();
    product.sales_count = 1;
    await act(async () => { await vi.advanceTimersByTimeAsync(30010); });
    expect(screen.getByText('7 of 7 setup steps complete')).toBeTruthy();
  } finally {
    cleanup();
    vi.useRealTimers();
  }
});

it('keeps account setup complete when verification is unavailable', async () => {
  api.get.mockImplementation((url: string) => {
    if (url === '/api/v1/storefront/payment-methods') return Promise.resolve({data: {data: [{account_ready: true, checkout_eligible: false}]}});
    return Promise.resolve({data: {data: []}});
  });
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  render(<QueryClientProvider client={client}><CreatorSetupChecklist /></QueryClientProvider>);
  expect(await screen.findByText('1 of 7 setup steps complete')).toBeTruthy();
});

it('keeps account setup complete when the configured bank is unavailable', async () => {
  api.get.mockImplementation((url: string) => {
    if (url === '/api/v1/storefront/payment-methods') return Promise.resolve({data: {data: [{account_configured: true, account_ready: false, checkout_eligible: false}]}});
    return Promise.resolve({data: {data: []}});
  });
  const client = new QueryClient({defaultOptions: {queries: {retry: false}}});
  render(<QueryClientProvider client={client}><CreatorSetupChecklist /></QueryClientProvider>);
  expect(await screen.findByText('1 of 7 setup steps complete')).toBeTruthy();
});

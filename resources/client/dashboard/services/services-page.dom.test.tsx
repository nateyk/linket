/** @vitest-environment jsdom */
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {DashboardLayoutContextProvider} from '@common/ui/dashboard/dashboard-layout-context';
import {MemoryRouter} from 'react-router';

const get = vi.fn();
const post = vi.fn();

vi.mock('@common/http/query-client', () => ({
  apiClient: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

const {Component} = await import('./services-page');

// jsdom implements no animation APIs, which the Base UI dropdown queries when
// its popup opens. Same shim as image-crop-wiring.test.tsx.
if (!(Element.prototype as unknown as {getAnimations?: unknown}).getAnimations) {
  (Element.prototype as unknown as {getAnimations: () => []}).getAnimations =
    () => [];
}

const service = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  title: 'Logo design',
  slug: 'logo-design',
  status: 'published',
  category: 'Design',
  short_description: 'A custom logo.',
  currency: 'ETB',
  starting_price_cents: 29900,
  packages_count: 2,
  faqs_count: 0,
  inquiries_count: 0,
  new_inquiries_count: 0,
  cover: null,
  public_url: 'https://nate.test/services/logo-design',
  updated_at: '2026-10-18T00:00:00Z',
  ...overrides,
});

afterEach(() => {
  get.mockReset();
  post.mockReset();
});

describe('services list', () => {
  it('offers the public page link only for a published service', async () => {
    get.mockImplementation(() =>
      Promise.resolve({
        data: {
          data: [
            service({status: 'draft'}),
            service({
              id: 2,
              title: 'Branding',
              slug: 'branding',
              public_url: 'https://nate.test/services/branding',
            }),
          ],
        },
      }),
    );

    render(
      <DashboardLayoutContextProvider name="test">
        {() => (
          <MemoryRouter>
            <Component />
          </MemoryRouter>
        )}
      </DashboardLayoutContextProvider>,
    );

    // The draft's public URL 404s until it is published, so offering the link
    // is a promise the page cannot keep. The published service keeps it.
    expect(await screen.findByText('Logo design')).toBeTruthy();

    const triggers = screen.getAllByRole('button', {name: 'Service actions'});
    expect(triggers).toHaveLength(2);

    await userEvent.click(triggers[0]);

    // Confirm the menu really opened before asserting what it omits.
    await waitFor(() => expect(screen.getByText('Publish')).toBeTruthy());
    expect(screen.queryByText('View public page')).toBeNull();

    await userEvent.click(triggers[1]);

    await waitFor(() =>
      expect(screen.getByText('View public page')).toBeTruthy(),
    );

    expect(
      screen
        .getByText('View public page')
        .closest('a')
        ?.getAttribute('href'),
    ).toBe('https://nate.test/services/branding');
  });
});
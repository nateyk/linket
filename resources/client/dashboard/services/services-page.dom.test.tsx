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

  it('filters published and draft services and clears the compact toolbar', async () => {
    get.mockResolvedValue({
      data: {data: [
        service({id: 1, title: 'Logo design', status: 'published'}),
        service({id: 2, title: 'Website build', status: 'draft', inquiries_count: 3}),
      ]},
    });
    const user = userEvent.setup();
    render(
      <DashboardLayoutContextProvider name="test">
        {() => (
          <MemoryRouter><Component /></MemoryRouter>
        )}
      </DashboardLayoutContextProvider>,
    );
    expect(await screen.findByText('Logo design')).toBeTruthy();
    expect(screen.getByText('Website build')).toBeTruthy();
    const filters = screen.getByRole('search', {name: 'Search services'});
    expect(filters.querySelector('[role="status"]')).toBeNull();
    expect(screen.queryByText(/published · .*drafts · .*inquiries/)).toBeNull();

    const search = screen.getByRole('searchbox', {name: 'Search services'});
    await user.type(search, 'website');
    expect(screen.queryByText('Logo design')).toBeNull();
    expect(screen.getByText('Website build')).toBeTruthy();

    await user.clear(search);
    await user.click(screen.getByRole('button', {name: 'Filter by status'}));
    await user.click(await screen.findByRole('menuitemradio', {name: 'Draft'}));
    await waitFor(() => expect(screen.queryByText('Logo design')).toBeNull());

    await user.type(search, 'not-a-service');
    expect(screen.getByText('No matching services')).toBeTruthy();
    await user.click(screen.getByRole('button', {name: 'Clear filters'}));
    expect(screen.queryByText('No matching services')).toBeNull();
    expect(screen.getByText('Logo design')).toBeTruthy();
    expect(screen.getByText('Website build')).toBeTruthy();
  });

  it('sorts the loaded services without issuing another search request', async () => {
    get.mockResolvedValue({
      data: {data: [
        service({id: 1, title: 'Logo design', inquiries_count: 1}),
        service({id: 2, title: 'Website build', inquiries_count: 8}),
      ]},
    });
    const user = userEvent.setup();
    render(
      <DashboardLayoutContextProvider name="test">
        {() => <MemoryRouter><Component /></MemoryRouter>}
      </DashboardLayoutContextProvider>,
    );
    expect(await screen.findByText('Logo design')).toBeTruthy();
    const before = get.mock.calls.length;
    await user.click(screen.getByRole('button', {name: 'Sort by'}));
    await user.click(await screen.findByRole('menuitemradio', {name: 'Most inquiries'}));
    await waitFor(() => {
      const titles = Array.from(document.querySelectorAll('[data-slot="card-title"]'))
        .map(element => element.textContent ?? '');
      expect(titles.findIndex(title => title.includes('Website build')))
        .toBeLessThan(titles.findIndex(title => title.includes('Logo design')));
    });
    expect(get.mock.calls.length).toBe(before);
  });

});
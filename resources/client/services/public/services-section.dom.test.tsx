/** @vitest-environment jsdom */
import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi, type Mock} from 'vitest';
import {apiClient} from '@common/http/query-client';
import {ServicesSection} from './services-section';

vi.mock('@common/http/query-client', () => ({
  apiClient: {get: vi.fn()},
}));

const biolink = {
  id: 2,
  back_half: 'natee',
  short_url: 'https://nate.test',
  public_service_count: 1,
} as never;

const services = [
  {
    id: 1,
    slug: 'brand-identity',
    title: 'Brand identity sprint',
    category: 'Design',
    short_description: 'A complete identity for your business.',
    skills: [],
    cover: {url: 'https://cdn.test/cover.jpg'},
    packages_count: 1,
    starting_price_cents: 29900,
    currency: 'ETB',
    public_url: 'https://nate.test/services/brand-identity',
  },
];

describe('services section', () => {
  it('renders the cards once the list arrives', async () => {
    (apiClient.get as Mock).mockResolvedValue({data: {data: services}});

    render(<ServicesSection biolink={biolink} appearance={null} />);

    expect(await screen.findByText('Brand identity sprint')).toBeTruthy();
    // One package reads as "1 package", not "1 packages".
    expect(screen.getByText('1 package')).toBeTruthy();
  });

  it('reports a failed load instead of claiming there are no services', async () => {
    (apiClient.get as Mock).mockRejectedValue(new Error('network down'));

    render(<ServicesSection biolink={biolink} appearance={null} />);

    expect(await screen.findByText("Couldn't load services")).toBeTruthy();
    expect(screen.queryByText('No services yet')).toBeNull();
  });

  it('shows the empty state when the creator has none', async () => {
    (apiClient.get as Mock).mockResolvedValue({data: {data: []}});

    render(<ServicesSection biolink={biolink} appearance={null} />);

    expect(await screen.findByText('No services yet')).toBeTruthy();
    expect(screen.queryByText("Couldn't load services")).toBeNull();
  });
});
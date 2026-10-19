/** @vitest-environment jsdom */
import {render, screen} from '@testing-library/react';
import {describe, expect, it} from 'vitest';
import {formatMoney} from '@ui/i18n/format-money';
import {ServiceCard} from './service-card';
import type {PublicService} from './service-types';

const service: PublicService = {
  id: 1,
  slug: 'brand-identity',
  title: 'Brand identity sprint',
  category: 'Design',
  short_description: 'A complete identity for your business.',
  skills: ['Branding'],
  cover: {url: 'https://cdn.test/cover.jpg'},
  packages_count: 3,
  starting_price_cents: 29900,
  currency: 'ETB',
  public_url: 'https://nate.test/services/brand-identity',
};

describe('service card', () => {
  it('reads like the product card: cover, title, description, price, action', () => {
    render(<ServiceCard service={service} appearance={null} />);

    expect(
      screen.getByRole('img', {name: 'Brand identity sprint'}),
    ).toHaveProperty('src', 'https://cdn.test/cover.jpg');
    expect(screen.getByText('Brand identity sprint')).toBeTruthy();
    expect(
      screen.getByText('A complete identity for your business.'),
    ).toBeTruthy();
    expect(screen.getByText('Design')).toBeTruthy();
    expect(screen.getByText(`From ${formatMoney(29900, 'ETB')}`)).toBeTruthy();
    expect(screen.getByText('3 packages')).toBeTruthy();
  });

  it('carries one View action to the service page, like a product card', () => {
    render(<ServiceCard service={service} appearance={null} />);

    const view = screen.getByRole('link', {
      name: 'View Brand identity sprint',
    });

    expect(view.getAttribute('href')).toBe(service.public_url);
    expect(view.textContent).toContain('View');
  });

  it('says quote-only instead of inventing a starting price', () => {
    render(
      <ServiceCard
        service={{...service, starting_price_cents: null}}
        appearance={null}
      />,
    );

    expect(screen.getByText('Request a quote')).toBeTruthy();
  });

  it('shows the same placeholder as a product without a cover', () => {
    const {container} = render(
      <ServiceCard service={{...service, cover: null}} appearance={null} />,
    );

    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('names the action for screen readers without repeating the title', () => {
    render(<ServiceCard service={service} appearance={null} />);

    // The visible label is "View"; the accessible name carries the service.
    expect(
      screen.getByRole('link', {name: 'View Brand identity sprint'}),
    ).toBeTruthy();
  });
});
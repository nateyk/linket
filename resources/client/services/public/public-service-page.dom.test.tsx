/** @vitest-environment jsdom */
import {render, screen, within} from '@testing-library/react';
import {formatMoney} from '@ui/i18n/format-money';
import {describe, expect, it} from 'vitest';
import {PublicServicePage} from './public-service-page';
import type {PublicServicePageData} from './service-types';

const data: PublicServicePageData = {
  store: {
    id: 7,
    name: 'Nate Studio',
    profile_config: {display_name: 'Nate'},
  } as PublicServicePageData['store'],
  appearance: null,
  service: {
    id: 1,
    slug: 'logo-design',
    title: 'Logo design',
    category: 'Design',
    short_description: 'A custom logo built for your brand.',
    skills: ['Logo', 'Branding'],
    cover: {url: 'https://cdn.test/cover.jpg'},
    packages_count: 2,
    starting_price_cents: 29900,
    currency: 'ETB',
    public_url: 'https://nate.test/services/logo-design',
    description: '<p>Three concepts, then refinement.</p>',
    gallery: [{id: 1, url: 'https://cdn.test/gallery.jpg'}],
    video_url: null,
    live_demo_url: null,
    contact_channels: [
      {type: 'whatsapp', label: 'WhatsApp', value: '+251911234567'},
      {type: 'email', label: 'Email', value: 'hello@example.test'},
    ],
    packages: [
      {
        id: 10,
        name: 'Starter',
        description: 'A single polished mark',
        price_cents: 29900,
        currency: 'ETB',
        delivery_days: 6,
        revisions: 2,
        features: ['One concept', 'PNG files'],
      },
      {
        id: 11,
        name: 'Premium',
        description: null,
        price_cents: null,
        currency: 'ETB',
        delivery_days: 3,
        revisions: 6,
        features: ['Three concepts'],
      },
    ],
    faqs: [
      {id: 20, question: 'How long does it take?', answer: 'Three days.'},
    ],
  },
  inquiry_endpoint: '/api/v1/public/stores/7/services/logo-design/inquiries',
  back_url: 'https://nate.test/services',
};

describe('public service page', () => {
  it('leads with the cover the creator set', () => {
    render(<PublicServicePage data={data} />);

    // The cover is the image the visitor sees first; the gallery follows it.
    expect(screen.getByRole('img', {name: 'Logo design'})).toHaveProperty(
      'src',
      'https://cdn.test/cover.jpg',
    );
    expect(screen.getByRole('button', {name: 'Logo design 1'})).toBeTruthy();
  });

  it('names the service, category, skills and short description', () => {
    render(<PublicServicePage data={data} />);

    expect(screen.getAllByText('Logo design').length).toBeGreaterThan(0);
    expect(screen.getByText('Design')).toBeTruthy();
    expect(screen.getByText('A custom logo built for your brand.')).toBeTruthy();
    expect(screen.getByText('Logo')).toBeTruthy();
    expect(screen.getByText('Branding')).toBeTruthy();
  });

  it('offers a priced package and a quote-only package behind package tabs', async () => {
    const {default: userEvent} = await import('@testing-library/user-event');
    render(<PublicServicePage data={data} />);

    expect(screen.getByRole('tab', {name: 'Starter'})).toBeTruthy();
    expect(screen.getByRole('tab', {name: 'Premium'})).toBeTruthy();
    expect(screen.getByText('A single polished mark')).toBeTruthy();
    expect(
      screen.getByRole('button', {name: /request this package/i}),
    ).toBeTruthy();

    await userEvent.click(screen.getByRole('tab', {name: 'Premium'}));

    // A blank price reads as quote-only, never as a zero.
    expect(screen.getByText('Quote only')).toBeTruthy();
    expect(screen.queryByText(/0\.00/)).toBeNull();
    expect(
      screen.getByRole('button', {name: /request this package/i}),
    ).toBeTruthy();
  });

  it('turns every configured channel into a working link', () => {
    render(<PublicServicePage data={data} />);

    expect(
      screen.getByRole('link', {name: /WhatsApp/i}).getAttribute('href'),
    ).toContain('wa.me');
    expect(
      screen.getByRole('link', {name: /Email/i}).getAttribute('href'),
    ).toBe('mailto:hello@example.test');
  });

  it('keeps the FAQ reachable behind its tab', async () => {
    const {default: userEvent} = await import('@testing-library/user-event');
    render(<PublicServicePage data={data} />);

    // The description is the default panel; the FAQ lives behind its tab.
    expect(screen.queryByText('How long does it take?')).toBeNull();

    await userEvent.click(screen.getByRole('tab', {name: 'FAQ'}));

    expect(screen.getByText('How long does it take?')).toBeTruthy();
  });

  it('shows what a tier includes in the offer rail', () => {
    render(<PublicServicePage data={data} />);

    // Delivery, revisions and the feature list all live beside the price,
    // the same way the product page's pricing card carries what is included.
    expect(screen.getByText('6 days delivery')).toBeTruthy();
    expect(screen.getByText('2 revisions')).toBeTruthy();
    expect(screen.getByText('One concept')).toBeTruthy();
    expect(screen.getByText('PNG files')).toBeTruthy();
    expect(
      screen.getByText('You agree the details and payment directly with the creator.'),
    ).toBeTruthy();
  });

  it('gives phones a quote action that opens the inquiry form', async () => {
    const {default: userEvent} = await import('@testing-library/user-event');
    render(<PublicServicePage data={data} />);

    // The same action as the rail, reachable without scrolling back up.
    const bar = screen.getByTestId('service-mobile-action');
    expect(
      within(bar).getByText(`From ${formatMoney(29900, 'ETB')}`),
    ).toBeTruthy();

    await userEvent.click(
      within(bar).getByRole('button', {name: 'Request a quote'}),
    );

    expect(await screen.findByRole('dialog')).toBeTruthy();
    expect(
      within(await screen.findByRole('dialog')).getByText('Request a quote'),
    ).toBeTruthy();
  });
});
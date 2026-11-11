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
    faqs: [{id: 20, question: 'How long does it take?', answer: 'Three days.'}],
  },
  inquiry_endpoint: '/api/v1/public/stores/7/services/logo-design/inquiries',
  back_url: 'https://nate.test?section=services',
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
    expect(
      screen.getByText('A custom logo built for your brand.'),
    ).toBeTruthy();
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

  it('paints unthemed primitives with the store theme, not OS-scheme tokens', () => {
    // The painted root claims the whole `--be-*` token set for its
    // subtree: outline buttons, accordion chevrons and every other
    // dashboard-token primitive would otherwise flip under a dark OS
    // scheme and ghost out on the painted surfaces.
    const {container} = render(
      <PublicServicePage
        data={{
          ...data,
          appearance: {
            bgConfig: {backgroundColor: '#111111', color: '#ffffff'},
          },
        }}
      />,
    );
    const root = container.firstElementChild as HTMLElement;

    expect(root.style.getPropertyValue('--be-foreground')).toBe(
      'var(--biolink-text)',
    );
    expect(root.style.getPropertyValue('--be-muted-foreground')).toBe(
      'var(--biolink-muted-text)',
    );
    expect(root.style.getPropertyValue('--be-border')).toBe(
      'var(--biolink-border)',
    );
    expect(root.style.getPropertyValue('--be-accent')).toBe(
      'var(--biolink-surface-muted)',
    );
    expect(root.style.getPropertyValue('--be-background')).toBe(
      'var(--biolink-surface-strong)',
    );
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
      screen.getByText(
        'You agree the details and payment directly with the creator.',
      ),
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

  it('keeps the inquiry action in the offer rail without repeating it on the seller card', () => {
    render(<PublicServicePage data={data} />);

    expect(screen.getByRole('button', {name: 'Request this package'})).toBeTruthy();
    expect(screen.queryByRole('button', {name: 'Send inquiry'})).toBeNull();
    const whatsapp = screen.getByRole('link', {name: 'WhatsApp'});
    expect(whatsapp.tagName).toBe('A');
    expect(whatsapp.getAttribute('href')).toBe('https://wa.me/251911234567');
    expect(whatsapp.getAttribute('data-slot')).toBeNull();
    expect(whatsapp.getAttribute('rel')).toContain('noopener');
    expect(whatsapp.className).toContain('min-h-11');
    expect(screen.getByRole('link', {name: 'Email'}).getAttribute('href')).toBe(
      'mailto:hello@example.test',
    );
  });

  it('deduplicates identical contact destinations while keeping different channels', () => {
    render(
      <PublicServicePage
        data={{
          ...data,
          service: {
            ...data.service,
            contact_channels: [
              ...data.service.contact_channels,
              {...data.service.contact_channels[0], label: 'Other WhatsApp'},
            ],
          },
        }}
      />,
    );

    expect(screen.getAllByRole('link', {name: 'WhatsApp'})).toHaveLength(1);
    expect(screen.getAllByRole('link', {name: 'Email'})).toHaveLength(1);
    expect(screen.queryByRole('link', {name: 'Other WhatsApp'})).toBeNull();
  });

  it('uses native accessible links for video and live demo external destinations', () => {
    render(
      <PublicServicePage
        data={{
          ...data,
          service: {
            ...data.service,
            video_url: 'https://videos.example.test/watch',
            live_demo_url: 'https://demo.example.test/preview',
          },
        }}
      />,
    );

    const video = screen.getByRole('link', {name: 'Video preview'});
    const demo = screen.getByRole('link', {name: 'Live demo'});
    expect(video.tagName).toBe('A');
    expect(video.getAttribute('href')).toBe('https://videos.example.test/watch');
    expect(demo.tagName).toBe('A');
    expect(demo.getAttribute('href')).toBe('https://demo.example.test/preview');
    for (const link of [video, demo]) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toContain('noopener');
    }
  });

  it('wraps long multilingual service text and makes package tabs horizontally scrollable', async () => {
    const {default: userEvent} = await import('@testing-library/user-event');
    const longTitle = 'አገልግሎት'.repeat(28);
    const longPackage = 'BrandIdentityFullPackage'.repeat(10);
    const longQuestion = 'HowDoIStartTheService'.repeat(10);
    render(
      <PublicServicePage
        data={{
          ...data,
          service: {
            ...data.service,
            title: longTitle,
            short_description: longTitle,
            packages: [
              {...data.service.packages[0], name: longPackage},
              data.service.packages[1],
            ],
            faqs: [{id: 30, question: longQuestion, answer: longPackage}],
          },
        }}
      />,
    );

    const title = screen.getByRole('heading', {level: 1, name: longTitle});
    expect(title.className).toContain('[overflow-wrap:anywhere]');
    const list = screen.getByRole('tablist', {name: 'Packages'});
    expect(list.parentElement?.className).toContain('overflow-x-auto');
    expect(screen.getByRole('tab', {name: longPackage}).className).toContain(
      '[overflow-wrap:anywhere]',
    );

    await userEvent.click(screen.getByRole('tab', {name: 'FAQ'}));
    const question = screen.getByRole('button', {name: longQuestion});
    expect(question.className).toContain('[overflow-wrap:anywhere]');
  });

  it('passes the selected tier through the package quote action', async () => {
    const {default: userEvent} = await import('@testing-library/user-event');
    render(<PublicServicePage data={data} />);

    await userEvent.click(screen.getByRole('tab', {name: 'Premium'}));
    await userEvent.click(
      screen.getByRole('button', {name: 'Request this package'}),
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Premium package/)).toBeTruthy();
  });

  it('keeps the selected tier when the mobile sticky action opens the quote dialog', async () => {
    const {default: userEvent} = await import('@testing-library/user-event');
    render(<PublicServicePage data={data} />);

    await userEvent.click(screen.getByRole('tab', {name: 'Premium'}));
    const mobileAction = screen.getByTestId('service-mobile-action');
    await userEvent.click(
      within(mobileAction).getByRole('button', {name: 'Request a quote'}),
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Premium package/)).toBeTruthy();
  });

  it('keeps a working inquiry with no packages and a direct action for one package', async () => {
    const {default: userEvent} = await import('@testing-library/user-event');
    const {rerender} = render(
      <PublicServicePage
        data={{
          ...data,
          service: {...data.service, packages: [], packages_count: 0},
        }}
      />,
    );
    expect(screen.getByRole('button', {name: 'Send inquiry'})).toBeTruthy();
    expect(screen.queryByRole('tablist', {name: 'Packages'})).toBeNull();

    rerender(
      <PublicServicePage
        data={{
          ...data,
          service: {
            ...data.service,
            packages: [data.service.packages[0]],
            packages_count: 1,
          },
        }}
      />,
    );
    expect(screen.queryByRole('tablist', {name: 'Packages'})).toBeNull();
    await userEvent.click(
      screen.getByRole('button', {name: 'Request this package'}),
    );
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText(/Starter package/)).toBeTruthy();
  });

});

/**
 * @vitest-environment jsdom
 *
 * The customer preview is the only place a creator sees what a visitor gets
 * before publishing, and it reads the same state the form writes — no second
 * source of truth to drift. These tests drive that state directly and assert
 * what the card says: the title, the lowest price ("Starting at"), every named
 * package with its delivery/revision meta, and the contact chips.
 *
 * Two rules matter as much as the content: a draft says it is a draft (a
 * preview that looks published teaches the wrong thing), and a package with no
 * price reads as "Quote", never as "0.00 Br".
 */
import {render, screen, within} from '@testing-library/react';
import {formatMoney} from '@ui/i18n/format-money';
import {afterEach, describe, expect, test, vi} from 'vitest';
import {emptyServiceForm, type ServiceFormState} from '../service-form-state';
import {ServicePreview} from './service-preview';

function draftWith(
  overrides: Partial<ServiceFormState> = {},
): ServiceFormState {
  return {
    ...emptyServiceForm(),
    title: 'Brand identity sprint',
    short_description: 'A custom logo and identity built for your brand.',
    category: 'Design',
    skills: 'Branding, Illustration, Typography',
    cover_url: 'https://cdn.example.test/cover.jpg',
    status: 'draft',
    packages: [
      {
        id: 11,
        name: 'Starter',
        description: '',
        price: '1500',
        delivery_days: '7',
        revisions: '2',
        features: '',
      },
      {
        id: 12,
        name: 'Premium',
        description: '',
        price: '2500',
        delivery_days: '14',
        revisions: '4',
        features: '',
      },
    ],
    contact_channels: [
      {type: 'whatsapp', label: 'Chat on WhatsApp', value: '+251911234567'},
      {type: 'email', label: 'Email me', value: 'hi@example.test'},
    ],
    ...overrides,
  };
}

/** The "Starting at <money>" price line under the title. */
function priceRow(): HTMLElement {
  return screen.getByText('Starting at').closest('span')!;
}

/** One package row of the preview's option list. */
function packageRow(name: string): HTMLElement {
  return screen.getByText(name).closest('li')!;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('a filled draft previews what the visitor gets', () => {
  test('shows the title, category, short description and skills', () => {
    render(<ServicePreview state={draftWith()} />);

    expect(screen.getByText('Brand identity sprint')).toBeTruthy();
    expect(screen.getByText('Design')).toBeTruthy();
    expect(
      screen.getByText('A custom logo and identity built for your brand.'),
    ).toBeTruthy();
    // Three comma-separated skills become three chips, not one long string.
    ['Branding', 'Illustration', 'Typography'].forEach(skill => {
      expect(screen.getByText(skill)).toBeTruthy();
    });
    expect(screen.queryByText('Branding, Illustration, Typography')).toBeNull();
  });

  test('leads with the lowest package price, not the highest', () => {
    render(<ServicePreview state={draftWith()} />);

    // 1500 ETB, not 2500: "Starting at" is the cheapest way in.
    expect(priceRow().textContent).toContain(formatMoney(150000, 'ETB'));
    expect(priceRow().textContent).not.toContain(formatMoney(250000, 'ETB'));
    expect(screen.queryByText('Request a quote')).toBeNull();
  });

  test('lists each named package with its delivery and revision meta', () => {
    render(<ServicePreview state={draftWith()} />);

    // Wording matches the public package panel, and both strings go through
    // the translator rather than being built in the component.
    const starter = packageRow('Starter');
    expect(within(starter).getByText('7 days delivery · 2 revisions')).toBeTruthy();
    expect(starter.textContent).toContain(formatMoney(150000, 'ETB'));

    const premium = packageRow('Premium');
    expect(
      within(premium).getByText('14 days delivery · 4 revisions'),
    ).toBeTruthy();
    expect(premium.textContent).toContain(formatMoney(250000, 'ETB'));
  });

  test('shows one chip per contact channel, labelled by the creator', () => {
    render(<ServicePreview state={draftWith()} />);

    expect(screen.getByText('Chat on WhatsApp')).toBeTruthy();
    expect(screen.getByText('Email me')).toBeTruthy();
    // The chip carries the label, never the raw handle or address.
    expect(screen.queryByText('+251911234567')).toBeNull();
  });

  test('falls back to the channel name, not the raw enum key', () => {
    const state = draftWith();
    state.contact_channels = [{type: 'telegram', label: '', value: '@studio'}];

    render(<ServicePreview state={state} />);

    // A creator who leaves the label blank must never see "telegram".
    expect(screen.getByText('Telegram')).toBeTruthy();
    expect(screen.queryByText('telegram')).toBeNull();
  });

  test('says it is a draft, because a published-looking preview lies', () => {
    render(<ServicePreview state={draftWith()} />);

    expect(
      screen.getByText('Draft — not visible to visitors yet'),
    ).toBeTruthy();
  });

  test('drops the draft badge once the service is published', () => {
    render(<ServicePreview state={draftWith({status: 'published'})} />);

    expect(
      screen.queryByText('Draft — not visible to visitors yet'),
    ).toBeNull();
  });
});

describe('an empty form previews as an empty, honest card', () => {
  test('falls back to a placeholder title and the quote prompt', () => {
    render(<ServicePreview state={emptyServiceForm()} />);

    expect(screen.getByText('Untitled service')).toBeTruthy();
    // Nothing has a price yet, so the price line is the quote prompt.
    expect(screen.getByText('Request a quote')).toBeTruthy();
  });

  test('still warns that a draft is not visible', () => {
    render(<ServicePreview state={emptyServiceForm()} />);

    expect(
      screen.getByText('Draft — not visible to visitors yet'),
    ).toBeTruthy();
  });

  test('invents no packages and no price row', () => {
    const {container} = render(<ServicePreview state={emptyServiceForm()} />);

    expect(container.querySelector('li')).toBeNull();
    expect(screen.queryByText('Starting at')).toBeNull();
    expect(screen.queryByText('Quote')).toBeNull();
  });
});

describe('a package with no price is a quote, not zero', () => {
  const quoteOnly = [
    {
      id: 12,
      name: 'Custom scope',
      description: '',
      price: '',
      delivery_days: '',
      revisions: '',
      features: '',
    },
  ];

  test('the row reads "Quote" and the price line asks for a quote', () => {
    render(<ServicePreview state={draftWith({packages: quoteOnly})} />);

    expect(within(packageRow('Custom scope')).getByText('Quote')).toBeTruthy();
    // A blank price must never surface as an amount — least of all 0.00.
    expect(screen.queryByText(formatMoney(0, 'ETB'))).toBeNull();
    expect(screen.getByText('Request a quote')).toBeTruthy();
  });

  test('a priced sibling keeps the "Starting at" line while the blank one says Quote', () => {
    render(
      <ServicePreview
        state={draftWith({
          packages: [
            {
              id: 11,
              name: 'Starter',
              description: '',
              price: '1500',
              delivery_days: '',
              revisions: '',
              features: '',
            },
            ...quoteOnly,
          ],
        })}
      />,
    );

    expect(within(packageRow('Custom scope')).getByText('Quote')).toBeTruthy();
    expect(priceRow().textContent).toContain(formatMoney(150000, 'ETB'));
    expect(screen.queryByText('Request a quote')).toBeNull();
  });
});

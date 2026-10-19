import {AxiosError} from 'axios';
import {describe, expect, test} from 'vitest';
import {parseServiceErrors, serviceSaveErrorMessage} from './service-save-error';
import {
  emptyServiceForm,
  fromServiceResource,
  toServicePayload,
  type CreatorServiceResource,
} from './service-form-state';

function validationError(
  message: string,
  errors: Record<string, string[]>,
): AxiosError {
  return new AxiosError(
    'Request failed with status code 422',
    'ERR_BAD_REQUEST',
    undefined,
    undefined,
    {
      status: 422,
      data: {message, errors},
      statusText: 'Unprocessable Content',
      headers: {},
      config: {} as never,
    },
  );
}

describe('service form state', () => {
  test('empty form starts with no packages so the section can onboard', () => {
    const form = emptyServiceForm();

    expect(form.title).toBe('');
    // Starting with one blank row denied the packages section its empty state,
    // which is where the Starter/Standard/Premium presets live.
    expect(form.packages).toHaveLength(0);
    expect(form.faqs).toHaveLength(0);
    expect(form.contact_channels).toHaveLength(0);
  });

  test('payload trims values, converts price to cents and splits features', () => {
    const form = emptyServiceForm();
    form.store_id = '3';
    form.title = '  Logo design  ';
    form.packages = [
      {
        name: '  Starter  ',
        description: ' One concept ',
        price: '12.5',
        delivery_days: '5',
        revisions: '2',
        features: 'One concept\n\nPNG files',
      },
      {
        name: '   ',
        description: '',
        price: '',
        delivery_days: '',
        revisions: '',
        features: '',
      },
    ];
    form.faqs = [{question: ' How long? ', answer: ' Five days '}];
    form.contact_channels = [
      {type: 'whatsapp', label: 'WhatsApp', value: ' +251911234567 '},
      {type: 'telegram', label: 'Telegram', value: ''},
    ];

    const payload = toServicePayload(form);

    expect(payload.title).toBe('Logo design');
    expect(payload.store_id).toBe(3);
    expect(payload.packages).toHaveLength(1);
    expect(payload.packages?.[0]).toMatchObject({
      name: 'Starter',
      description: 'One concept',
      price_cents: 1250,
      delivery_days: 5,
      revisions: 2,
      features: ['One concept', 'PNG files'],
    });
    expect(payload.faqs).toEqual([
      {question: 'How long?', answer: 'Five days'},
    ]);
    expect(payload.contact_channels).toEqual([
      {type: 'whatsapp', label: 'WhatsApp', value: '+251911234567'},
    ]);
  });

  test('blank price becomes a quote-only package', () => {
    const form = emptyServiceForm();
    form.store_id = '1';
    form.title = 'Consulting';
    form.packages = [
      {
        name: 'Custom',
        description: '',
        price: '',
        delivery_days: '',
        revisions: '',
        features: '',
      },
    ];

    expect(toServicePayload(form).packages?.[0].price_cents).toBeNull();
  });

  test('hydration keeps ids and formats price for editing', () => {
    const service: CreatorServiceResource = {
      id: 7,
      title: 'Logo design',
      slug: 'logo-design',
      status: 'published',
      category: 'Design',
      skills: ['Logo', 'Branding'],
      short_description: 'A logo',
      description: '<p>Hello</p>',
      video_url: null,
      live_demo_url: 'https://example.com',
      contact_channels: [
        {type: 'telegram', label: 'Telegram', value: 'studio'},
      ],
      cover: {id: 5, url: '/cover.png'},
      gallery: [{id: 1, file_entry_id: 7, url: '/gallery.png'}],
      packages: [
        {
          id: 11,
          name: 'Starter',
          description: 'One concept',
          price_cents: 29900,
          currency: 'ETB',
          delivery_days: 6,
          revisions: 2,
          features: ['One concept', 'PNG files'],
          position: 0,
        },
      ],
      faqs: [{id: 2, question: 'How long?', answer: 'Five days', position: 0}],
      store: {id: 3, name: 'Store', short_url: 'https://example.com'},
      public_url: 'https://example.com/services/logo-design',
    };

    const form = fromServiceResource(service);

    expect(form.store_id).toBe('3');
    expect(form.cover_file_entry_id).toBe(5);
    expect(form.cover_url).toBe('/cover.png');
    expect(form.gallery).toEqual([
      {id: 1, file_entry_id: 7, url: '/gallery.png'},
    ]);
    expect(form.skills).toBe('Logo, Branding');
    expect(form.packages[0].id).toBe(11);
    expect(form.packages[0].price).toBe('299');
    expect(form.packages[0].features).toBe('One concept\nPNG files');
    expect(form.faqs[0].id).toBe(2);
  });
});

describe('service form errors', () => {
  test('exposes nested Laravel validation errors', () => {
    const parsed = parseServiceErrors(
      validationError('The given data was invalid.', {
        'packages.0.name': ['Package name is required.'],
        title: ['Title is required.'],
      }),
    );

    expect(parsed.message).toBe('The given data was invalid.');
    expect(parsed.fieldErrors['packages.0.name']).toBe(
      'Package name is required.',
    );
    expect(parsed.fieldErrors.title).toBe('Title is required.');
  });

  test('shows the API abort message and falls back for unknown errors', () => {
    expect(
      serviceSaveErrorMessage(
        validationError("You've reached your service limit.", {}),
      ),
    ).toBe("You've reached your service limit.");

    expect(serviceSaveErrorMessage(new Error('Network down'))).toBe(
      'Unable to save service.',
    );
  });
});

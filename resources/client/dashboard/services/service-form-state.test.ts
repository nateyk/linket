import {AxiosError} from 'axios';
import {describe, expect, test} from 'vitest';
import {parseServiceErrors, serviceSaveErrorMessage} from './service-save-error';
import {
  emptyServiceForm,
  fromServiceResource,
  serviceFormClientErrors,
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

  test('client validation prevents package values from being silently converted or dropped', () => {
    const form = emptyServiceForm();
    form.packages = [
      {
        name: 'Starter',
        description: '',
        price: '-5',
        delivery_days: '1.5',
        revisions: '101',
        features: `${'x'.repeat(201)}\n${Array.from({length: 20}, (_, index) => `Feature ${index + 1}`).join('\n')}`,
      },
      {
        name: '',
        description: 'Work already typed here',
        price: '',
        delivery_days: '',
        revisions: '',
        features: '',
      },
    ];

    expect(serviceFormClientErrors(form)).toEqual({
      'packages.0.price_cents': 'Enter a valid price from 0 to 10,000,000 ETB.',
      'packages.0.delivery_days': 'Delivery days must be a whole number from 0 to 365.',
      'packages.0.revisions': 'Revisions must be a whole number from 0 to 100.',
      'packages.0.features': 'Use no more than 20 features, with 200 characters or fewer per feature.',
      'packages.1.name': 'Add a package name or remove this unfinished package.',
    });
  });

  test('client validation prevents partially completed FAQ and contact rows from disappearing', () => {
    const form = emptyServiceForm();
    form.faqs = [
      {question: 'How long does it take?', answer: ''},
      {question: '', answer: 'Usually five days.'},
    ];
    form.contact_channels = [
      {type: 'telegram', label: 'Message me', value: ''},
    ];

    expect(serviceFormClientErrors(form)).toEqual({
      'faqs.0.answer': 'Add an answer or remove this unfinished FAQ.',
      'faqs.1.question': 'Add a question or remove this unfinished FAQ.',
      'contact_channels.0.value': 'Add a contact value or remove this unfinished contact button.',
    });
  });

  test('blank optional rows and valid quote-only packages remain saveable', () => {
    const form = emptyServiceForm();
    form.packages = [
      {
        name: 'Custom',
        description: '',
        price: '',
        delivery_days: '',
        revisions: '',
        features: '',
      },
      {
        name: '',
        description: '',
        price: '',
        delivery_days: '',
        revisions: '',
        features: '',
      },
    ];
    form.faqs = [{question: '', answer: ''}];
    form.contact_channels = [{type: 'whatsapp', label: '', value: ''}];

    expect(serviceFormClientErrors(form)).toEqual({});
  });

  test('validates the optional buyer questions and preserves them in the payload', () => {
    const form = emptyServiceForm();
    expect(form.buyer_questions).toEqual([]);
    form.buyer_questions = ['  When is your deadline?  ', ''];
    expect(serviceFormClientErrors(form)).toEqual({
      'buyer_questions.1': 'Write a question of 160 characters or fewer, or remove it.',
    });
    form.buyer_questions = ['  When is your deadline?  ', 'How much is your budget?'];
    expect(serviceFormClientErrors(form)).toEqual({});
    expect(toServicePayload(form).buyer_questions).toEqual([
      'When is your deadline?', 'How much is your budget?',
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

import {describe, expect, test} from 'vitest';
import {contactChannelHref} from './service-contact-links';

describe('contactChannelHref', () => {
  test('builds WhatsApp and Telegram links', () => {
    expect(
      contactChannelHref({
        type: 'whatsapp',
        label: 'WhatsApp',
        value: '+251 911 234 567',
      }),
    ).toBe('https://wa.me/251911234567');

    expect(
      contactChannelHref({
        type: 'telegram',
        label: 'Telegram',
        value: '@studio',
      }),
    ).toBe('https://t.me/studio');
  });

  test('builds mail, phone and web links', () => {
    expect(
      contactChannelHref({
        type: 'email',
        label: 'Email',
        value: 'hi@example.com',
      }),
    ).toBe('mailto:hi@example.com');

    expect(
      contactChannelHref({
        type: 'phone',
        label: 'Phone',
        value: '+251911234567',
      }),
    ).toBe('tel:+251911234567');

    expect(
      contactChannelHref({
        type: 'link',
        label: 'Portfolio',
        value: 'https://example.com/work',
      }),
    ).toBe('https://example.com/work');
  });

  test('rejects unsafe or empty values', () => {
    expect(
      contactChannelHref({type: 'link', label: '', value: 'javascript:alert(1)'}),
    ).toBeNull();
    expect(contactChannelHref({type: 'link', label: '', value: ''})).toBeNull();
    expect(
      contactChannelHref({type: 'email', label: '', value: 'not-an-email'}),
    ).toBeNull();
    expect(
      contactChannelHref({type: 'whatsapp', label: '', value: '123'}),
    ).toBeNull();
  });
});

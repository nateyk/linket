import {describe, expect, test} from 'vitest';
import {
  buildInquiryPayload,
  emptyInquiryForm,
  validateInquiryForm,
} from './service-inquiry-form';

describe('service inquiry form', () => {
  test('trims the payload and omits empty optional fields', () => {
    expect(
      buildInquiryPayload({
        name: '  Sara Buyer ',
        email: ' sara@example.test ',
        phone: '   ',
        message: ' I need a logo. ',
        packageId: 3,
      }),
    ).toEqual({
      name: 'Sara Buyer',
      email: 'sara@example.test',
      message: 'I need a logo.',
      package_id: 3,
    });
  });

  test('validates required fields and email format', () => {
    expect(validateInquiryForm(emptyInquiryForm())).toEqual({
      name: 'required',
      email: 'required',
      message: 'required',
    });

    expect(
      validateInquiryForm({
        ...emptyInquiryForm(),
        name: 'Sara',
        email: 'not-an-email',
        message: 'Hi',
      }),
    ).toEqual({email: 'invalid'});
  });

  test('accepts a complete form', () => {
    expect(
      validateInquiryForm({
        name: 'Sara',
        email: 'sara@example.test',
        phone: '+251911234567',
        message: 'Hello',
        packageId: 2,
      }),
    ).toEqual({});
  });
});

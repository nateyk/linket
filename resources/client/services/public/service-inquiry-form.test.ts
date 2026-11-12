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

  test('optional answers keep their configured positions and trim text', () => {
    const form = {
      ...emptyInquiryForm(2, ['Deadline?', 'Budget?', 'Other?']),
      name: 'Sara',
      email: 'sara@example.test',
      message: 'Hi',
      answers: ['  ', ' ETB 10,000 ', '  By Friday  '],
    };
    expect(validateInquiryForm(form)).toEqual({});
    expect(buildInquiryPayload(form)).toEqual({
      name: 'Sara',
      email: 'sara@example.test',
      message: 'Hi',
      package_id: 2,
      answers: ['', 'ETB 10,000', 'By Friday'],
    });
  });

  test('no buyer questions means no extra inquiry payload and long answers fail', () => {
    expect(emptyInquiryForm().answers).toEqual([]);
    const form = {
      ...emptyInquiryForm(undefined, ['What is your budget?']),
      name: 'Sara',
      email: 'sara@example.test',
      message: 'Hi',
      answers: ['x'.repeat(501)],
    };
    expect(validateInquiryForm(form)).toEqual({answers: {0: 'too_long'}});
    form.answers[0] = '   ';
    expect(buildInquiryPayload(form)).toEqual({
      name: 'Sara', email: 'sara@example.test', message: 'Hi',
    });
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

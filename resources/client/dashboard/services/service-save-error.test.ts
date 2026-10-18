import {AxiosError} from 'axios';
import {describe, expect, test} from 'vitest';
import {parseServiceErrors, serviceSaveErrorMessage} from './service-save-error';

describe('serviceSaveErrorMessage', () => {
  test('uses the API message for validation responses', () => {
    const reason = new AxiosError(
      'Request failed with status code 422',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 422,
        data: {message: 'Package name is required.'},
        statusText: 'Unprocessable Content',
        headers: {},
        config: {} as never,
      },
    );

    expect(serviceSaveErrorMessage(reason)).toBe('Package name is required.');
  });

  test('falls back when the response has no API message', () => {
    expect(serviceSaveErrorMessage(new Error('Network down'))).toBe(
      'Unable to save service.',
    );
  });

  test('parseServiceErrors returns a flat field map', () => {
    const reason = new AxiosError(
      'Request failed with status code 422',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 422,
        data: {
          message: 'The given data was invalid.',
          errors: {
            'packages.1.name': ['Second package needs a name.'],
            title: ['Title is required.'],
          },
        },
        statusText: 'Unprocessable Content',
        headers: {},
        config: {} as never,
      },
    );

    expect(parseServiceErrors(reason)).toEqual({
      message: 'The given data was invalid.',
      fieldErrors: {
        'packages.1.name': 'Second package needs a name.',
        title: 'Title is required.',
      },
    });
  });
});

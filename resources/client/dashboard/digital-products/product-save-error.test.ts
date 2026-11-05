import {AxiosError} from 'axios';
import {describe, expect, test} from 'vitest';
import {productSaveErrorMessage} from './product-save-error';

describe('productSaveErrorMessage', () => {
  test('shows the Laravel abort message instead of the axios status line', () => {
    const reason = new AxiosError(
      'Request failed with status code 422',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      {
        status: 422,
        data: {
          message: "You've reached your plan limit of 5 paid products.",
        },
        statusText: 'Unprocessable Content',
        headers: {},
        config: {} as never,
      },
    );

    expect(productSaveErrorMessage(reason, false)).toBe(
      "You've reached your plan limit of 5 paid products.",
    );
  });

  test('keeps the draft-saved submission failure copy', () => {
    const reason = new AxiosError('Request failed with status code 422');

    expect(productSaveErrorMessage(reason, true)).toBe(
      'Draft saved, but submission failed. Fix the issue and try again.',
    );
  });

  test('does not claim submission failed when its network response is unknown', () => {
    expect(productSaveErrorMessage(new Error('No response'), true, true)).toBe(
      'Draft saved, but we could not confirm submission. Check My Items before submitting again.',
    );
  });

  test('falls back to the error message when the response has no API message', () => {
    expect(productSaveErrorMessage(new Error('Network down'), false)).toBe(
      'Network down',
    );
  });
});

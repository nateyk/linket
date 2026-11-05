import {AxiosError} from 'axios';
import {describe, expect, test} from 'vitest';
import {isUncertainMutationOutcome} from './request-outcome';

function httpError(status: number) {
  return new AxiosError('Synthetic HTTP error', 'ERR_BAD_RESPONSE', undefined, undefined, {
    status,
    statusText: 'Synthetic',
    data: {message: 'Synthetic response'},
    headers: {},
    config: {} as never,
  });
}

describe('create and submit request outcome classification', () => {
  test('only HTTP client rejection confirms a failed mutation', () => {
    expect(isUncertainMutationOutcome(httpError(422))).toBe(false);
    expect(isUncertainMutationOutcome(httpError(403))).toBe(false);
    expect(isUncertainMutationOutcome(httpError(429))).toBe(false);
  });

  test('network failures, server errors, and malformed responses remain unknown', () => {
    expect(isUncertainMutationOutcome(new AxiosError('Offline', 'ERR_NETWORK'))).toBe(true);
    expect(isUncertainMutationOutcome(httpError(503))).toBe(true);
    expect(isUncertainMutationOutcome(httpError(500))).toBe(true);
    expect(isUncertainMutationOutcome(new Error('Malformed 2xx response'))).toBe(true);
  });
});

import {describe, expect, test} from 'vitest';
import {decodeBackendFilters} from './decode-backend-filters';
import {encodeBackendFilters} from './encode-backend-filters';

describe('decodeBackendFilters', () => {
  test('decodes a valid encoded filter list', () => {
    const encoded = encodeBackendFilters([
      {key: 'status', value: 'active', operator: 'equals'},
    ]);
    expect(decodeBackendFilters(encoded)).toEqual([
      {key: 'status', value: 'active', operator: 'equals'},
    ]);
  });

  test('maps valueKey onto value so selects work properly', () => {
    const encoded = encodeBackendFilters([
      {key: 'category', value: '', valueKey: 42},
    ]);
    expect(decodeBackendFilters(encoded)).toEqual([
      {key: 'category', value: 42, valueKey: 42},
    ]);
  });

  test('returns an empty list for null or empty input', () => {
    expect(decodeBackendFilters(null)).toEqual([]);
    expect(decodeBackendFilters('')).toEqual([]);
  });

  test('returns an empty list for a malformed percent sequence', () => {
    expect(decodeBackendFilters('%E0%A4%A')).toEqual([]);
    expect(decodeBackendFilters('%')).toEqual([]);
    expect(decodeBackendFilters('foo%')).toEqual([]);
  });

  test('returns an empty list for malformed base64', () => {
    expect(decodeBackendFilters(encodeURIComponent('not base64!!!'))).toEqual(
      [],
    );
  });

  test('returns an empty list for malformed JSON', () => {
    expect(decodeBackendFilters(encodeURIComponent(btoa('not json')))).toEqual(
      [],
    );
  });
});

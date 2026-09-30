import {afterEach, describe, expect, test, vi} from 'vitest';
import {getCookie} from './use-cookie';

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockDocumentCookie(cookie: string) {
  vi.stubGlobal('document', {cookie});
}

describe('getCookie', () => {
  test('returns the decoded value of a matching cookie', () => {
    mockDocumentCookie('theme=dark');
    expect(getCookie('theme')).toBe('dark');
  });

  test('decodes percent-encoded values', () => {
    mockDocumentCookie('greeting=hello%20world');
    expect(getCookie('greeting')).toBe('hello world');
  });

  test('returns the initial value when the cookie is not found', () => {
    mockDocumentCookie('theme=dark');
    expect(getCookie('missing')).toBe('');
    expect(getCookie('missing', 'fallback')).toBe('fallback');
  });

  test('returns the initial value when there are no cookies', () => {
    mockDocumentCookie('');
    expect(getCookie('theme')).toBe('');
    expect(getCookie('theme', 'fallback')).toBe('fallback');
  });

  test('does not throw on a malformed percent sequence and returns the raw value', () => {
    mockDocumentCookie('bad=%E0%A4%A');
    expect(getCookie('bad')).toBe('%E0%A4%A');
  });

  test('keeps scanning past malformed cookies for other names', () => {
    mockDocumentCookie('bad=%E0%A4%A; good=1');
    expect(getCookie('good')).toBe('1');
  });
});

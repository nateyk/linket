import {describe, expect, test} from 'vitest';
import {parsePortalSection, PORTAL_SECTIONS} from './portal-section';

describe('parsePortalSection', () => {
  test('defaults to overview when missing or empty', () => {
    expect(parsePortalSection(null)).toBe('overview');
    expect(parsePortalSection(undefined)).toBe('overview');
    expect(parsePortalSection('')).toBe('overview');
  });

  test('accepts each known section id', () => {
    for (const section of PORTAL_SECTIONS) {
      expect(parsePortalSection(section)).toBe(section);
    }
  });

  test('falls back to overview for unknown values', () => {
    expect(parsePortalSection('wishlist')).toBe('overview');
    expect(parsePortalSection('COURSES')).toBe('overview');
  });
});

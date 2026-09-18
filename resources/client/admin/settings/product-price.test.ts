import {describe, expect, it} from 'vitest';
import {
  centsToEtb,
  etbToCents,
  settingsBooleanToSwitch,
  switchToSettingsBoolean,
} from './product-price';

describe('centsToEtb', () => {
  it('converts stored cents to display units', () => {
    expect(centsToEtb('5000')).toBe(50);
    expect(centsToEtb(5050)).toBe(50.5);
  });

  it('maps empty values to null (unlimited)', () => {
    expect(centsToEtb('')).toBeNull();
    expect(centsToEtb(null)).toBeNull();
    expect(centsToEtb(undefined)).toBeNull();
  });
});

describe('etbToCents', () => {
  it('converts display units back to stored cents strings', () => {
    expect(etbToCents(50)).toBe('5000');
    expect(etbToCents('50.5')).toBe('5050');
  });

  it('rounds fractional cents', () => {
    expect(etbToCents(49.99)).toBe('4999');
  });

  it('maps empty values to empty string (unlimited)', () => {
    expect(etbToCents('')).toBe('');
    expect(etbToCents(null)).toBe('');
    expect(etbToCents(undefined)).toBe('');
  });

  it('rejects negative values', () => {
    expect(etbToCents(-5)).toBe('');
  });
});

describe('free products switch mapping', () => {
  it('round-trips through the stringified settings form values', () => {
    expect(settingsBooleanToSwitch('1')).toBe(true);
    expect(settingsBooleanToSwitch('0')).toBe(false);
    expect(switchToSettingsBoolean(true)).toBe('1');
    expect(switchToSettingsBoolean(false)).toBe('0');
  });

  it('treats unset values as off (form defaultValues apply the allowed default)', () => {
    expect(settingsBooleanToSwitch(undefined)).toBe(false);
  });
});

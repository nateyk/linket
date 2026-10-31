import {describe, expect, test} from 'vitest';
import {pickNestedValue} from './pick-nested-value';

describe('pickNestedValue', () => {
  test('reads nested settings values without mutating the source', () => {
    const settings = {ads: {header: '<p>Hi</p>'}};
    expect(pickNestedValue('ads.header', settings)).toBe('<p>Hi</p>');
    expect(settings).toEqual({ads: {header: '<p>Hi</p>'}});
  });

  test('supports array indexes and literal dots escaped in keys', () => {
    expect(pickNestedValue('menus.0.title', {menus: [{title: 'Home'}]})).toBe(
      'Home',
    );
    expect(pickNestedValue('a\\.b.title', {'a.b': {title: 'Yes'}})).toBe('Yes');
  });

  test('returns undefined for absent, null, and inherited properties', () => {
    expect(pickNestedValue('missing', {})).toBeUndefined();
    expect(pickNestedValue('a.b', {a: null})).toBeUndefined();
    expect(pickNestedValue('toString', {})).toBeUndefined();
  });

  test('refuses paths that cross a prototype', () => {
    expect(pickNestedValue('__proto__.polluted', {})).toBeUndefined();
    expect(pickNestedValue('constructor.name', {})).toBeUndefined();
    expect(pickNestedValue('x.prototype', {x: {prototype: 'bad'}})).toBeUndefined();
  });
});

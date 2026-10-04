/**
 * @vitest-environment jsdom
 */
import {render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';
import {ColorSwatch} from './color-swatch';

test('preset swatch exposes its color as its name (A-03)', () => {
  render(<ColorSwatch color="#ff0000" onChange={() => {}} />);

  expect(screen.getByRole('button', {name: '#ff0000'})).toBeTruthy();
});

test('preset swatch uses the shared focus ring in primary (A-14)', () => {
  render(<ColorSwatch color="#ff0000" onChange={() => {}} />);

  const swatch = screen.getByRole('button', {name: '#ff0000'});
  expect(swatch.className).toContain('focus-visible:outline-2');
  expect(swatch.className).toContain('focus-visible:outline-solid');
  expect(swatch.className).toContain('focus-visible:outline-primary');
});

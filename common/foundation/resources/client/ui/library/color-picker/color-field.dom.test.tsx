/**
 * @vitest-environment jsdom
 */
import {render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';
import {ColorField} from './color-field';

test('swatch trigger is named by the visible label plus the current value (A-03)', () => {
  render(
    <ColorField value="#3b82f6" onChange={() => {}} label={<span>Color</span>} />,
  );

  const swatch = screen.getByRole('button', {name: /Color\s+#3b82f6/});
  expect(swatch.className).toContain('size-9');
});

test('without a label the swatch is still named by its current value (A-03)', () => {
  render(<ColorField value="#000000" onChange={() => {}} label={null} />);

  expect(screen.getByRole('button', {name: /#000000/})).toBeTruthy();
});

test('swatch trigger uses the shared focus ring (A-14)', () => {
  render(
    <ColorField value="#3b82f6" onChange={() => {}} label={<span>Color</span>} />,
  );

  const swatch = screen.getByRole('button', {name: /Color\s+#3b82f6/});
  expect(swatch.className).toContain('focus-visible:outline-2');
  expect(swatch.className).toContain('focus-visible:outline-offset-2');
});

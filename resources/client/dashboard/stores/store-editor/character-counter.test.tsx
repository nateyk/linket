/**
 * @vitest-environment jsdom
 */
import {render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';

import {CharacterCounter} from './character-counter';

test('renders the used and maximum character count as "n/max" (A-18)', () => {
  render(<CharacterCounter current={12} max={150} />);
  expect(screen.getByText('12/150').textContent).toBe('12/150');
});

test('stays unflagged below 90% of the limit', () => {
  const {container} = render(<CharacterCounter current={134} max={150} />);
  const counter = container.firstElementChild as HTMLElement;
  expect(counter.className).not.toContain('text-warning');
});

test('warns once the user reaches 90% of the limit', () => {
  const {container} = render(<CharacterCounter current={135} max={150} />);
  const counter = container.firstElementChild as HTMLElement;
  expect(counter.className).toContain('text-warning');
});

test('keeps warning when the limit is reached', () => {
  const {container} = render(<CharacterCounter current={150} max={150} />);
  const counter = container.firstElementChild as HTMLElement;
  expect(counter.className).toContain('text-warning');
  expect(counter.textContent).toBe('150/150');
});

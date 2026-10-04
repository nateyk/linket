/**
 * @vitest-environment jsdom
 */
import {render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';

import {CharacterCounter} from './character-counter';

test('renders the used and maximum character count as "n/max" (A-18)', () => {
  render(<CharacterCounter current={12} max={600} />);
  expect(screen.getByText('12/600').textContent).toBe('12/600');
});

test('stays unflagged below 90% of the limit', () => {
  const {container} = render(<CharacterCounter current={539} max={600} />);
  const counter = container.firstElementChild as HTMLElement;
  expect(counter.className).not.toContain('text-warning');
});

test('warns once the user reaches 90% of the limit', () => {
  const {container} = render(<CharacterCounter current={540} max={600} />);
  const counter = container.firstElementChild as HTMLElement;
  expect(counter.className).toContain('text-warning');
});

test('keeps warning when the limit is reached', () => {
  const {container} = render(<CharacterCounter current={600} max={600} />);
  const counter = container.firstElementChild as HTMLElement;
  expect(counter.className).toContain('text-warning');
  expect(counter.textContent).toBe('600/600');
});

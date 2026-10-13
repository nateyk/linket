/**
 * @vitest-environment jsdom
 */
import {render, screen} from '@testing-library/react';
import type {ComponentProps} from 'react';
import {MemoryRouter} from 'react-router';
import {expect, test} from 'vitest';
import {HelpSearch} from './help-search';

const renderSearch = (props: Partial<ComponentProps<typeof HelpSearch>>) =>
  render(
    <MemoryRouter>
      <HelpSearch {...props} />
    </MemoryRouter>,
  );

test('renders a GET form targeting /help with a search input', () => {
  const {container} = renderSearch({defaultValue: 'billing'});

  const form = container.querySelector('form');
  expect(form).not.toBeNull();
  expect(form?.getAttribute('action')).toBe('/help');
  expect(form?.getAttribute('method')).toBe('GET');

  const input = screen.getByRole<HTMLInputElement>('textbox');
  expect(input.getAttribute('name')).toBe('search');
  expect(input.value).toBe('billing');
  expect(input.getAttribute('placeholder')).toBe('Ask us a question...');
});

test('renders a submit button labeled Search', () => {
  renderSearch({});

  const label = screen.getByText('Search');
  const button = label.closest('button');
  expect(button).not.toBeNull();
  expect(button?.getAttribute('type')).toBe('submit');
});

test('renders the large pill variant without errors', () => {
  const {container} = renderSearch({size: 'lg'});

  expect(screen.getByRole('textbox').getAttribute('name')).toBe('search');
  // sanctioned CSS-var radius override from input-group.stories.tsx
  expect(container.querySelector('[class*="--radius:9999px"]')).not.toBeNull();
  expect(container.querySelector('form')).not.toBeNull();
});

/**
 * @vitest-environment jsdom
 */
import {render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {MemoryRouter} from 'react-router';
import {expect, test} from 'vitest';
import {HelpFaq} from './help-faq';
import {HelpCategory} from '@common/help/help-queries';

const categories: HelpCategory[] = [
  {
    id: 1,
    name: 'Getting started',
    slug: 'getting-started',
    views: 0,
    articles: [
      {
        id: 1,
        title: 'How do I create my first link?',
        slug: 'create-first-link',
        short_description: 'Click the New link button in your dashboard.',
        views: 100,
        likes: 0,
        dislikes: 0,
        help_category_id: 1,
        created_at: '2026-01-01',
      },
      {
        id: 2,
        title: 'How do I change my username?',
        slug: 'change-username',
        short_description: 'Open Settings, then Profile.',
        views: 40,
        likes: 0,
        dislikes: 0,
        help_category_id: 1,
        created_at: '2026-01-01',
      },
    ],
  },
];

const renderFaq = (limit?: number) =>
  render(
    <MemoryRouter>
      <HelpFaq categories={categories} limit={limit} />
    </MemoryRouter>,
  );

test('renders the section heading and the most-viewed article as a question', () => {
  renderFaq();

  expect(
    screen.getByText('Most frequently asked questions'),
  ).toBeTruthy();
  // most-viewed (id 1, 100 views) is listed before id 2 (40 views)
  expect(screen.getByText('How do I create my first link?')).toBeTruthy();
  expect(screen.getByText('How do I change my username?')).toBeTruthy();
});

test('shows each short description and a read-full-article link', async () => {
  const user = userEvent.setup();
  renderFaq();

  // Base UI only mounts the panel content once the item is expanded.
  await user.click(
    screen.getByRole('button', {name: /How do I create my first link\?/}),
  );

  await waitFor(() => {
    expect(
      screen.getByText('Click the New link button in your dashboard.'),
    ).toBeTruthy();
  });

  const links = screen.getAllByRole('link');
  expect(
    links.some(a => a.getAttribute('href') === '/help/articles/create-first-link'),
  ).toBe(true);
});

test('respects the limit', () => {
  renderFaq(1);

  expect(screen.getByText('How do I create my first link?')).toBeTruthy();
  expect(screen.queryByText('How do I change my username?')).toBeNull();
});

test('renders nothing when there are no articles', () => {
  const {container} = render(
    <MemoryRouter>
      <HelpFaq categories={[]} />
    </MemoryRouter>,
  );

  expect(container.innerHTML).toBe('');
});

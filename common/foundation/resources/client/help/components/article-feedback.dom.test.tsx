/**
 * @vitest-environment jsdom
 */
import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';
import {ArticleFeedback} from './article-feedback';

const renderFeedback = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ArticleFeedback slug="creating-your-first-short-link" likes={2} dislikes={1} />
    </QueryClientProvider>,
  );

test('uses an h3 so it continues the article heading outline instead of skipping to h5', () => {
  const {container} = renderFeedback();

  expect(
    screen.getByRole('heading', {level: 3, name: 'Was this article helpful?'}),
  ).toBeTruthy();
  expect(container.querySelector('h5')).toBeNull();
});

/**
 * @vitest-environment jsdom
 */
import {render, screen} from '@testing-library/react';
import {expect, test} from 'vitest';
import {HelpArticleBody} from './help-article-body';

test('strips script tags from article html', () => {
  const {container} = render(
    <HelpArticleBody html="<script>alert(1)</script><p>hi</p>" />,
  );

  expect(container.querySelector('script')).toBeNull();
  expect(screen.getByText('hi')).toBeTruthy();
});

test('strips event handler attributes but keeps formatting', () => {
  const {container} = render(
    <HelpArticleBody
      html='<p onclick="alert(1)">hi</p><strong>bold</strong><a href="https://example.com">link</a>'
    />,
  );

  expect(container.querySelector('[onclick]')).toBeNull();
  expect(container.querySelector('strong')).not.toBeNull();
  expect(container.querySelector('a')?.getAttribute('href')).toBe(
    'https://example.com',
  );
});

test('keeps safe formatting tags', () => {
  render(
    <HelpArticleBody html="<h2>Title</h2><ul><li>item</li></ul><code>code</code>" />,
  );

  expect(screen.getByText('Title')).toBeTruthy();
  expect(screen.getByText('item')).toBeTruthy();
  expect(screen.getByText('code')).toBeTruthy();
});

test('caps prose at the typography measure instead of stretching line length', () => {
  const {container} = render(<HelpArticleBody html="<p>hi</p>" />);

  // max-w-none stretched body lines to ~94ch; without it the prose default
  // (max-width: 65ch) keeps lines under the 80ch craft floor.
  expect(container.querySelector('.prose')?.className).not.toContain(
    'max-w-none',
  );
});

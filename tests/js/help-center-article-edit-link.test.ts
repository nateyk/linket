import {getEditArticleLink} from '@app/help-center/articles/article-link';
import {describe, expect, it} from 'vitest';

describe('public Help Center article edit navigation', () => {
  const article = {id: 42};

  it('keeps administrators in the shared admin Help Center', () => {
    expect(getEditArticleLink(article, {isAdmin: true})).toBe('/admin/help/articles/42/edit');
  });

  it('keeps support agents in the agent Help Center', () => {
    expect(getEditArticleLink(article, {isAdmin: false})).toBe('/agent/hc/articles/42/edit');
    expect(getEditArticleLink(article)).toBe('/agent/hc/articles/42/edit');
  });
});

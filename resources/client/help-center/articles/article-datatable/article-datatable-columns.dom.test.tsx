/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@testing-library/react';
import {ArticleDatatableColumns} from '@app/help-center/articles/article-datatable/article-datatable-columns';
import type {ArticleDatatableItem} from '@app/help-center/articles/article-datatable/article-datatable-item';
import {MemoryRouter} from 'react-router';
import {afterEach, describe, expect, it, vi} from 'vitest';

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <>{message}</>,
}));
vi.mock('@ui/i18n/use-trans', () => ({
  useTrans: () => ({trans: ({message}: {message: string}) => message}),
}));

const article: ArticleDatatableItem = {
  id: 57,
  title: 'Shipping guide',
  slug: 'shipping-guide',
  draft: true,
  used_by_ai_agent: false,
  author: {id: 1, name: 'Writer', image: null, email: null},
  tags: [],
  updated_at: '2026-11-13T00:00:00Z',
  path: [],
};

function cell(key: string, item: ArticleDatatableItem) {
  const column = ArticleDatatableColumns.find(c => c.key === key);
  if (!column) throw new Error('Column missing: ' + key);
  return column.body(item, {index: 0, isHovered: false});
}

afterEach(() => cleanup());

describe('Help Center article table', () => {
  it('shows publication and AI states as text rather than color-only icons', () => {
    const {rerender} = render(
      <>
        {cell('draft', article)}
        {cell('used_by_ai_agent', article)}
      </>,
    );
    expect(screen.getByText('Draft')).toBeTruthy();
    expect(screen.getByText('Disabled')).toBeTruthy();

    rerender(
      <>
        {cell('draft', {...article, draft: false})}
        {cell('used_by_ai_agent', {...article, used_by_ai_agent: true})}
      </>,
    );
    expect(screen.getByText('Published')).toBeTruthy();
    expect(screen.getByText('Enabled')).toBeTruthy();
  });

  it('names the edit action for keyboard and screen reader users', () => {
    render(
      <MemoryRouter>
        {cell('actions', article)}
      </MemoryRouter>,
    );
    const edit = screen.getByRole('link', {name: 'Edit article'});
    expect(edit.getAttribute('href')).toContain('57/edit');
  });
});

/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@testing-library/react';
import {ArticleSectionSelector} from '@app/help-center/articles/article-editor/article-section-selector';
import type {CreateArticlePayload} from '@app/help-center/articles/requests/use-create-article';
import {FormProvider, useForm} from 'react-hook-form';
import {afterEach, describe, expect, it, vi} from 'vitest';

vi.mock('@tanstack/react-query', async importOriginal => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQuery: () => ({
      data: {
        categories: [{
          id: 4,
          name: 'መመሪያዎች — Getting started',
          sections: [{id: 11, name: 'Long section title for narrow layouts', parent_id: 4}],
        }],
      },
    }),
  };
});
vi.mock('@ui/overlays/dialog/dialog-trigger', () => ({
  DialogTrigger: ({children}: {children: React.ReactNode[]}) => <>{children[0]}</>,
}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <>{message}</>,
}));
vi.mock('@ui/i18n/use-trans', () => ({
  useTrans: () => ({trans: ({message}: {message: string}) => message}),
}));

function Harness({sections}: {sections: number[]}) {
  const form = useForm<CreateArticlePayload>({
    defaultValues: {title: '', body: '', draft: true, visibility: 'public', attachments: [], sections},
  });
  return (
    <FormProvider {...form}>
      <ArticleSectionSelector onSave={vi.fn()} />
    </FormProvider>
  );
}

afterEach(() => cleanup());

describe('Help Center section picker', () => {
  it('exposes a keyboard-usable native trigger with a clear accessible name', () => {
    render(<Harness sections={[]} />);

    const trigger = screen.getByRole('button', {name: 'Select sections'});
    expect(trigger.tagName).toBe('BUTTON');
    expect(trigger.textContent).toContain('Select a section');
    expect(trigger.className).toContain('focus-visible:outline-2');
  });

  it('keeps long category and translated section names readable when selected', () => {
    render(<Harness sections={[11]} />);

    const trigger = screen.getByRole('button', {name: 'Select sections'});
    expect(trigger.textContent).toContain('መመሪያዎች');
    expect(trigger.textContent).toContain('Long section title');
    expect(trigger.querySelectorAll('.break-words')).toHaveLength(2);
  });
});

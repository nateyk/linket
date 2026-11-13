/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@testing-library/react';
import {TogglePublishedButton} from '@app/help-center/articles/article-editor/toggle-published-button';
import type {UpdateArticlePageData} from '@app/help-center/articles/article-editor/update-article-page-data';
import type {UpdateArticlePayload} from '@app/help-center/articles/requests/use-update-article';
import {FormProvider, useForm} from 'react-hook-form';
import type {ReactNode} from 'react';
import {afterEach, describe, expect, it, vi} from 'vitest';

const mutation = vi.hoisted(() => ({mutate: vi.fn()}));
vi.mock('@app/help-center/articles/requests/use-update-article', () => ({
  useUpdateArticle: () => ({mutate: mutation.mutate, isPending: false}),
}));
vi.mock('@ui/buttons/button', () => ({
  Button: ({
    children,
    disabled,
    onClick,
    title,
  }: {
    children: ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    title?: string;
  }) => (
    <button type="button" disabled={disabled} onClick={onClick} title={title}>
      {children}
    </button>
  ),
}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => <>{message}</>,
}));
vi.mock('@ui/i18n/use-trans', () => ({
  useTrans: () => ({trans: ({message}: {message: string}) => message}),
}));

function Harness({draft}: {draft: boolean}) {
  const form = useForm<UpdateArticlePayload>({
    defaultValues: {id: 42, title: 'Original'},
  });
  const article = {id: 42, draft} as UpdateArticlePageData['article'];
  return (
    <FormProvider {...form}>
      <TogglePublishedButton article={article} />
      <button
        type="button"
        onClick={() => form.setValue('title', 'Unsaved title', {shouldDirty: true})}
      >
        Modify article
      </button>
    </FormProvider>
  );
}

afterEach(() => {
  cleanup();
  mutation.mutate.mockClear();
});

describe('Help Center publication safety', () => {
  it('publishes a saved draft and blocks publication until unsaved changes are saved', () => {
    render(<Harness draft />);

    fireEvent.click(screen.getByRole('button', {name: 'Publish'}));
    expect(mutation.mutate).toHaveBeenCalledWith({id: 42, draft: false});
    fireEvent.click(screen.getByRole('button', {name: 'Modify article'}));
    expect((screen.getByRole('button', {name: 'Publish'}) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('Save changes');
    expect(mutation.mutate).toHaveBeenCalledTimes(1);
  });

  it('uses the same unsaved-change guard for unpublishing', () => {
    render(<Harness draft={false} />);

    fireEvent.click(screen.getByRole('button', {name: 'Modify article'}));
    expect((screen.getByRole('button', {name: 'Unpublish'}) as HTMLButtonElement).disabled).toBe(true);
    expect(mutation.mutate).not.toHaveBeenCalled();
  });
});

import {resetArticleSaveBaselineIfUnchanged} from '@app/help-center/articles/article-editor/reset-article-save-baseline';
import type {UpdateArticlePayload} from '@app/help-center/articles/requests/use-update-article';
import type {UseFormReturn} from 'react-hook-form';
import {describe, expect, it, vi} from 'vitest';

function makeForm(initial: UpdateArticlePayload) {
  let current = initial;
  const reset = vi.fn();
  const form = {
    getValues: () => current,
    reset,
  } as unknown as Pick<UseFormReturn<UpdateArticlePayload>, 'getValues' | 'reset'>;

  return {
    form,
    reset,
    edit: (value: UpdateArticlePayload) => { current = value; },
  };
}

describe('Help Center article save baseline', () => {
  it('clears dirty state only when the editor still matches the saved snapshot', () => {
    const original = {id: 42, title: 'Saved title', body: '<p>Saved</p>', sections: [1]};
    const {form, reset} = makeForm(original);
    expect(resetArticleSaveBaselineIfUnchanged(form, JSON.stringify(original))).toBe(true);
    expect(reset).toHaveBeenCalledWith(original);
  });

  it('does not mark edits made during an in-flight save as saved', () => {
    const original = {id: 42, title: 'Saved title', body: '<p>Saved</p>', sections: [1]};
    const {form, reset, edit} = makeForm(original);
    const submittedSnapshot = JSON.stringify(original);
    edit({...original, body: '<p>New edit while saving</p>', sections: [1, 2]});
    expect(resetArticleSaveBaselineIfUnchanged(form, submittedSnapshot)).toBe(false);
    expect(reset).not.toHaveBeenCalled();
  });
});

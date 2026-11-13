import type {UpdateArticlePayload} from '@app/help-center/articles/requests/use-update-article';
import type {UseFormReturn} from 'react-hook-form';

/**
 * The server saved the submitted snapshot, not necessarily the editor's latest
 * values. Leave the form dirty when editing continued while Save was pending.
 */
export function resetArticleSaveBaselineIfUnchanged(
  form: Pick<UseFormReturn<UpdateArticlePayload>, 'getValues' | 'reset'>,
  submittedSnapshot: string,
): boolean {
  if (JSON.stringify(form.getValues()) !== submittedSnapshot) {
    return false;
  }

  form.reset(JSON.parse(submittedSnapshot) as UpdateArticlePayload);
  return true;
}

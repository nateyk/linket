import {renderAboutHtml} from '@app/short-links/renderers/biolink-renderer/about-markdown';
import {UseFormReturn} from 'react-hook-form';
import {CreatorProfileConfig} from './creator-profile-types';

export type CreatorProfileForm = Omit<CreatorProfileConfig, 'skills'> & {
  skills: string;
};

/** Max characters for the short "bio" field, enforced by the input and shown
 * in the live character counter (A-18). */
export const BIO_MAX_LENGTH = 600;

/**
 * TipTap re-serializes the normalized About HTML slightly differently than
 * `renderAboutHtml` (list paragraphs, attribute order, entity encoding), and
 * reports that canonical form via `onEditorReady` before any user input.
 * Rebasing a pristine form's default to it keeps the mount-time round-trip
 * from reading as an edit — otherwise a fresh editor would show Save as
 * enabled and the unsaved-changes guard would fire a false prompt (A-01/A-02).
 * Dirtiness from other fields is never touched.
 */
export function rebaseAboutFormOnEditorReady(
  form: UseFormReturn<CreatorProfileForm>,
  currentAboutHtml: string | undefined,
  canonicalHtml: string,
) {
  if (form.formState.isDirty || canonicalHtml === currentAboutHtml) {
    return;
  }
  form.reset({...form.getValues(), about_html: canonicalHtml});
}

/**
 * Initial react-hook-form values for the creator profile editor. `about_html`
 * is normalized through the very function the public renderer uses, so the
 * editor opens WYSIWYG (A-01) and the next save re-stores canonical HTML.
 */
export function buildInitialProfileFormValues(
  config: CreatorProfileConfig,
): CreatorProfileForm {
  return {
    ...config,
    about_html: renderAboutHtml(config.about_html),
    skills: config.skills.join(', '),
  };
}

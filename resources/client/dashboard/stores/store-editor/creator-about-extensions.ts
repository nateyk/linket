import {Placeholder} from '@tiptap/extensions';
import StarterKit from '@tiptap/starter-kit';

/**
 * TipTap configuration for the About editor.
 *
 * Heading levels must mirror what the public renderer produces: the shared
 * normalizer maps `#`→h2, `##`→h3 and `###`/`####`→h4, so h4 has to parse
 * as a real heading here or the editor silently flattens it (A-01).
 */
export const creatorAboutExtensions = [
  StarterKit.configure({
    heading: {levels: [2, 3, 4]},
    code: false,
    codeBlock: false,
    strike: false,
    underline: {},
    link: {
      shouldAutoLink: value => /^https?:\/\//.test(value),
    },
  }),
  Placeholder.configure({
    placeholder: 'Share your story, experience, and approach...',
  }),
];

import {Placeholder} from '@tiptap/extensions';
import {Extension} from '@tiptap/core';
import {EditorState, Plugin, PluginKey} from '@tiptap/pm/state';
import {Decoration, DecorationSet} from '@tiptap/pm/view';
import StarterKit from '@tiptap/starter-kit';

/**
 * Content can start at a deep heading level (a document whose first heading
 * is `###` normalizes to h4). The About panel already shows an h2 above the
 * editor, so a bare h4 under it skips a level — axe's `heading-order` rule
 * and screen-reader outlines both see the gap (A-09).
 *
 * Rebase the whole document by one uniform level in the VIEW ONLY, via node
 * decorations, so:
 * - relative nesting inside the content stays exact,
 * - serialization is untouched (the public page keeps rendering h4 — A-01),
 * - nothing is written back to the database.
 */
const headingLevelRebaseKey = new PluginKey('aboutHeadingLevelRebase');

// The panel's h2 sits at level 2, so content headings must start at 3.
const TARGET_TOP_LEVEL = 3;

function rebasedHeadingDecorations(state: EditorState): DecorationSet {
  const headings: {level: number; from: number; size: number}[] = [];
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') {
      headings.push({
        level: node.attrs.level as number,
        from: pos,
        size: node.nodeSize,
      });
    }
    return true;
  });
  if (!headings.length) return DecorationSet.empty;

  const min = Math.min(...headings.map(h => h.level));
  const shift = Math.max(0, min - TARGET_TOP_LEVEL);
  if (shift === 0) return DecorationSet.empty;

  return DecorationSet.create(
    state.doc,
    headings.map(h =>
      Decoration.node(h.from, h.from + h.size, {
        'aria-level': String(h.level - shift),
      }),
    ),
  );
}

const AboutHeadingLevelRebase = Extension.create({
  name: 'aboutHeadingLevelRebase',
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: headingLevelRebaseKey,
        state: {
          init: (_, state) => rebasedHeadingDecorations(state),
          apply: (_tr, _old, _oldState, newState) =>
            rebasedHeadingDecorations(newState),
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

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
  AboutHeadingLevelRebase,
];

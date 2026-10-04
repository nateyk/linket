/**
 * @vitest-environment jsdom
 */
import {Editor} from '@tiptap/core';
import {expect, test} from 'vitest';
import {renderAboutHtml} from '@app/short-links/renderers/biolink-renderer/about-markdown';
import {STORE_3006_ABOUT_HTML} from '@app/short-links/renderers/biolink-renderer/store-3006-about.fixture';
import {creatorAboutExtensions} from './creator-about-extensions';

test('the About editor parses the canonical document into real blocks (A-01)', () => {
  const editor = new Editor({extensions: creatorAboutExtensions});
  editor.commands.setContent(renderAboutHtml(STORE_3006_ABOUT_HTML));
  const html = editor.getHTML();

  // What TipTap serializes must stay structurally equal to what the public
  // page renders: real headings, rules, lists — and the repaired href.
  expect(html).toContain('<h4');
  expect(html).toContain('<hr');
  expect(html).toContain('<ul');
  expect(html).toContain(
    'href="https://codecanyon.net/item/gadgetza-deals-listing-platform-saas/41758961?s_rank=3"',
  );
  expect(html).not.toContain('###');

  editor.destroy();
});

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

test('deep content headings are rebased in the view so the outline never skips (A-09)', () => {
  const editor = new Editor({extensions: creatorAboutExtensions});
  editor.commands.setContent(renderAboutHtml(STORE_3006_ABOUT_HTML));

  const headings = [...editor.view.dom.querySelectorAll('h1,h2,h3,h4,h5,h6')];
  expect(headings.length).toBeGreaterThan(0);

  // The panel renders an h2 above this content, so a bare h4 under it skips
  // a level (axe heading-order + screen-reader outline). Every heading's
  // effective level must ascend by at most one, starting from that h2.
  const levelOf = (h: Element) =>
    parseInt(h.getAttribute('aria-level') ?? h.tagName.slice(1), 10);
  let prev = 2;
  for (const h of headings) {
    expect(levelOf(h)).toBeLessThanOrEqual(prev + 1);
    expect(levelOf(h)).toBeGreaterThanOrEqual(1);
    prev = levelOf(h);
  }

  // The rebasing lives only in the view: serialization stays byte-identical
  // to what the public page renders (A-01 contract).
  expect(editor.getHTML()).not.toContain('aria-level');

  editor.destroy();
});

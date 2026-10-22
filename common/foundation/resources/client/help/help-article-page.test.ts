import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, test} from 'vitest';

const source = fs.readFileSync(
  path.resolve(
    'common/foundation/resources/client/help/help-article-page.tsx',
  ),
  'utf8',
);

describe('help article page layout', () => {
  test('article body flows below the opening grid row, not inside a column', () => {
    // One column stretched the first viewport: the long article inside the
    // grid's 1fr column ran far past the fold while the aside floated in
    // dead space. The body sits after the grid so the opening row stays
    // short and the long content flows below it.
    expect(source.indexOf('<HelpArticleBody')).toBeGreaterThan(
      source.indexOf('</aside>'),
    );
    expect(source).toContain('xl:grid-cols-[1fr_320px]');
  });

  test('page outline stays flat: h1 → h2 sections → h3 feedback, no skipped levels', () => {
    // The body flows after the aside now, so the aside's heading sits
    // directly under the h1 and must be an h2 (was h5: h1 → h5 skips).
    const related = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/help/components/related-articles.tsx',
      ),
      'utf8',
    );
    expect(related).toContain('<h2 className="mb-3 px-3 pt-2 font-medium">');
    expect(related).not.toContain('<h5');

    const feedback = fs.readFileSync(
      path.resolve(
        'common/foundation/resources/client/help/components/article-feedback.tsx',
      ),
      'utf8',
    );
    expect(feedback).toContain('<h3 className="mb-3 font-medium">');
    expect(feedback).not.toContain('<h5');
  });
});

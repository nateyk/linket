import fs from 'node:fs';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {canUseProductCopyDraft} from './product-ai-copy-review-state';

const draft = {
  title: 'Worksheet draft',
  description: 'Printable practice lessons.',
  source_fingerprint: 'a'.repeat(64),
  local_title: 'Original worksheet',
  local_description: '<p>Existing description</p>',
};

describe('creator-reviewed product suggestions', () => {
  it('requires unchanged source data, revision token and safe edited text', () => {
    expect(canUseProductCopyDraft(draft, draft.local_title, draft.local_description, 'Good copy.')).toBe(true);
    expect(canUseProductCopyDraft(draft, 'Changed', draft.local_description, 'Good copy.')).toBe(false);
    expect(canUseProductCopyDraft(draft, draft.local_title, 'Edited', 'Good copy.')).toBe(false);
    expect(canUseProductCopyDraft(draft, draft.local_title, draft.local_description, '<script>alert(1)</script>')).toBe(false);
    expect(canUseProductCopyDraft(draft, draft.local_title, draft.local_description, '   ')).toBe(false);
    expect(canUseProductCopyDraft({...draft, source_fingerprint: 'bad'}, draft.local_title, draft.local_description, 'Good copy.')).toBe(false);
  });

  it('checks the server revision before using, without saving or publishing directly', () => {
    const source = fs.readFileSync(path.resolve('resources/client/dashboard/digital-products/product-ai-copy-review.tsx'), 'utf8');
    const form = fs.readFileSync(path.resolve('resources/client/dashboard/digital-products/digital-product-form-page.tsx'), 'utf8');
    expect(source).toContain("base + '/copy-revision'");
    expect(source).toContain('onUseDescription(text.trim())');
    expect(source).toContain('Use description');
    expect(source).not.toMatch(/apiClient\.(put|patch|delete)\(/);
    expect(source).not.toContain('/submit');
    expect(form).toContain('setCopyRevision(current => current + 1)');
    expect(form).toContain('<ProductAiCopyReview');
  });
});


describe('copy review accessible and safe error recovery contract', () => {
  it('keeps labels, stable focus targets, status announcements and keyboard dismissal', () => {
    const source = fs.readFileSync(
      path.resolve('resources/client/dashboard/digital-products/product-ai-copy-review.tsx'),
      'utf8',
    );
    expect(source).toContain('aria-labelledby={titleId}');
    expect(source).toContain('aria-busy={busy}');
    expect(source).toContain('htmlFor={suggestionId}');
    expect(source).toContain('aria-describedby={hintId}');
    expect(source).toContain("event.key === 'Escape'");
    expect(source).toContain('document.getElementById(suggestionId)?.focus()');
    expect(source).toContain('triggerRef.current?.focus()');
    expect(source).toContain('<Textarea');
    expect(source).toContain('role="alert"');
    expect(source).toContain('role="status"');
    expect(source).toContain('status === 429');
    expect(source).toContain('status === 409');
  });
});

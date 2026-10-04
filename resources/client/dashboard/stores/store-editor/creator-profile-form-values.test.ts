import {describe, expect, test} from 'vitest';
import {renderAboutHtml} from '@app/short-links/renderers/biolink-renderer/about-markdown';
import {STORE_3006_ABOUT_HTML} from '@app/short-links/renderers/biolink-renderer/store-3006-about.fixture';
import {buildInitialProfileFormValues} from './creator-profile-form-values';
import type {CreatorProfileConfig} from './creator-profile-types';

const storedConfig: CreatorProfileConfig = {
  display_name: 'Nathanael',
  profile_title: 'Creative director',
  bio: 'short bio',
  about_html: STORE_3006_ABOUT_HTML,
  avatar_url: '',
  cover_url: '',
  available_for_work: false,
  skills: ['Design', 'Photo'],
  follow_url: '',
  contact_url: '',
  social_links: {instagram: 'https://instagram.com/x'},
};

describe('buildInitialProfileFormValues', () => {
  test('starts the About field from what the public page renders (A-01)', () => {
    const values = buildInitialProfileFormValues(storedConfig);
    // WYSIWYG: the editor opens on the canonical document — the exact HTML
    // the public page shows — never the raw stored source.
    expect(values.about_html).toBe(renderAboutHtml(storedConfig.about_html));
    expect(values.about_html).toContain('<h4>');
    expect(values.about_html).not.toContain('###');
    expect(values.about_html).not.toContain(')**');
  });

  test('keeps the stored config as the form defaults', () => {
    const values = buildInitialProfileFormValues(storedConfig);
    expect(values.display_name).toBe('Nathanael');
    expect(values.profile_title).toBe('Creative director');
    expect(values.bio).toBe('short bio');
    expect(values.skills).toBe('Design, Photo');
    expect(values.available_for_work).toBe(false);
    expect(values.social_links).toEqual({
      instagram: 'https://instagram.com/x',
    });
  });
});

import {
  CreatorStories,
  publishableCreatorStories,
  safeStorefrontPath,
} from '@common/ui/landing-page/creator-stories/creator-stories';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => message,
}));

const valid = {
  creatorName: 'Approved Example',
  role: 'Designer',
  quote: 'I launched my portfolio on Linket.',
  storefrontPath: '/real-creator',
  image: {src: '/uploads/real-approved-storefront.webp', width: 1200, height: 800},
  imageAlt: 'Screenshot of approved creator store',
  approved: true,
};

describe('creator stories public proof gate', () => {
  it('never renders empty or unapproved marketing stories', () => {
    expect(renderToStaticMarkup(
      <CreatorStories config={{name: 'creator-stories', stories: []}} />,
    )).toBe('');
    expect(renderToStaticMarkup(
      <CreatorStories config={{name: 'creator-stories', stories: [{...valid, approved: false}]}} />,
    )).toBe('');
  });

  it('requires genuine image and a safe same-site public storefront path', () => {
    const stories = [
      {...valid, storefrontPath: 'javascript:alert(1)'},
      {...valid, storefrontPath: '//evil.example'},
      {...valid, storefrontPath: 'https://example.com/creator'},
      {...valid, image: undefined},
      valid,
    ];
    expect(publishableCreatorStories(stories)).toEqual([valid]);
    expect(safeStorefrontPath('/creator')).toBe('/creator');
    expect(safeStorefrontPath('javascript:alert(1)')).toBeNull();
  });

  it('renders only approved content, an accessible screenshot, and real storefront link', () => {
    const html = renderToStaticMarkup(
      <CreatorStories config={{
        name: 'creator-stories',
        badge: 'Made with Linket',
        title: 'Real creators',
        stories: [valid, {...valid, creatorName: 'Unapproved', approved: false}],
      }} />,
    );
    expect(html).toContain('Real creators');
    expect(html).toContain('Screenshot of approved creator store');
    expect(html).toContain('/uploads/real-approved-storefront.webp');
    expect(html).toContain('href="/real-creator"');
    expect(html).toContain('View Approved Example');
    expect(html).toContain('I launched my portfolio');
    expect(html).not.toContain('Unapproved');
    expect(html).not.toContain('1000+');
    expect(html).not.toContain('five stars');
  });
});

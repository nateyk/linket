import FeaturesGrid from '@common/ui/landing-page/features/features-grid';
import type {FeaturesGridConfig} from '@common/ui/landing-page/features/features-grid';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => message,
}));
vi.mock('@common/ui/landing-page/config-icon', () => ({
  ConfigIconWithBg: () => <span data-testid="legacy-feature-icon" />,
}));

const journey: FeaturesGridConfig = {
  name: 'features-grid',
  presentation: 'journey',
  badge: 'How Linket works',
  title: 'From your first idea to your first sale',
  description: 'A storefront in three steps.',
  mutedBg: true,
  features: [
    {
      title: 'Create your storefront',
      description: 'Bring your products together.',
      image: {src: '/journey-create.svg', width: 1200, height: 800},
    },
    {
      title: 'Share your link',
      description: 'Find your next customer.',
      image: {src: '/journey-share.svg', width: 1200, height: 800},
    },
    {
      title: 'Sell and manage orders',
      description: 'Follow confirmed orders.',
      image: {src: '/journey-sell.svg', width: 1200, height: 800},
    },
  ],
};

describe('Linket creator homepage journey', () => {
  it('renders three ordered steps with independently replaceable images', () => {
    const html = renderToStaticMarkup(<FeaturesGrid config={journey} />);

    expect(html).toContain('<ol');
    expect(html.match(/<li /g)).toHaveLength(3);
    expect(html).toContain('From your first idea to your first sale');
    expect(html).toContain('/journey-create.svg');
    expect(html).toContain('/journey-share.svg');
    expect(html).toContain('/journey-sell.svg');
    expect(html.indexOf('Create your storefront')).toBeLessThan(html.indexOf('Share your link'));
    expect(html.indexOf('Share your link')).toBeLessThan(html.indexOf('Sell and manage orders'));
    expect(html).toContain('md:grid-cols-3');
    expect(html).not.toContain('legacy-feature-icon');
  });

  it('keeps step content readable when an image is removed', () => {
    const config: FeaturesGridConfig = {
      ...journey,
      features: [
        {title: 'Create', description: 'Set up the page.'},
      ],
    };
    const html = renderToStaticMarkup(<FeaturesGrid config={config} />);

    expect(html).toContain('Set up the page.');
    expect(html).toContain('from-primary/10');
    expect(html).not.toContain('<img');
  });

  it('keeps the original feature grid for sections not using journey presentation', () => {
    const config: FeaturesGridConfig = {
      name: 'features-grid',
      maxColumns: 4,
      iconsOnTop: true,
      features: [{title: 'Ebooks', description: 'Digital guides', icon: 'stores'}],
    };
    const html = renderToStaticMarkup(<FeaturesGrid config={config} />);

    expect(html).toContain('<dl');
    expect(html).toContain('lg:grid-cols-4');
    expect(html).toContain('legacy-feature-icon');
    expect(html).not.toContain('<ol');
  });
});

describe('Linket digital product media showcase', () => {
  it('renders four product types in a responsive media-first layout', () => {
    const config: FeaturesGridConfig = {
      name: 'features-grid',
      presentation: 'catalog',
      title: 'Sell more than just downloads',
      badge: 'What you can sell',
      description: 'Digital products, courses and services',
      features: [
        {title: 'Ebooks', description: 'Publish your knowledge', image: {src: '/uploads/ebook.webp', width: 1200, height: 900}},
        {title: 'Digital products', description: 'Templates and files', icon: 'links'},
        {title: 'Courses', description: 'Teach and train', image: {src: '/uploads/courses.svg'}},
        {title: 'Services', description: 'Offer your work'},
      ],
    };
    const html = renderToStaticMarkup(<FeaturesGrid config={config} />);

    expect(html).toContain('Sell more than just downloads');
    expect(html).toContain('sm:grid-cols-2 lg:grid-cols-4');
    expect(html.match(/<li /g)).toHaveLength(4);
    expect(html).toContain('/uploads/ebook.webp');
    expect(html).toContain('/uploads/courses.svg');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('legacy-feature-icon'); // retained until edited
    expect(html).toContain('Offer your work'); // text works without an asset
    expect(html).not.toContain('<ol'); // not a workflow
  });

  it('shows uploaded media instead of legacy icon when both are configured', () => {
    const config: FeaturesGridConfig = {
      name: 'features-grid',
      presentation: 'catalog',
      features: [{
        title: 'Ebooks', description: 'Guides',
        icon: 'stores',
        image: {src: '/uploads/ebook.svg'},
      }],
    };
    const html = renderToStaticMarkup(<FeaturesGrid config={config} />);
    expect(html).toContain('/uploads/ebook.svg');
    expect(html).not.toContain('legacy-feature-icon');
  });
});

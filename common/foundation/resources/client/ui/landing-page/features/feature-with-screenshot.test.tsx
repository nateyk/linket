import {FeatureWithScreenshot} from '@common/ui/landing-page/features/feature-with-screenshot';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';

vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => message,
}));
vi.mock('@common/ui/landing-page/config-icon', () => ({
  ConfigIcon: () => <span data-slot="test-icon" />,
  ConfigIconWithBg: () => <span data-slot="test-icon" />,
}));

const base = {
  name: 'feature-with-screenshot' as const,
  title: 'A storefront that looks like you',
  badge: 'Linket creator',
  description: 'Share your work with your audience.',
  presentation: 'creator' as const,
  features: [{title: 'Customize', description: 'Choose your page layout.'}],
  image: {src: '/images/desktop-store.png', width: 1200, height: 800},
};

describe('creator homepage product screenshot showcase', () => {
  it('frames real uploaded desktop and mobile previews without duplicate textual proof', () => {
    const html = renderToStaticMarkup(
      <FeatureWithScreenshot config={{
        ...base,
        mediaVariant: 'browser',
        imageAlt: 'Storefront builder desktop screenshot',
        mobileImage: {src: '/images/mobile-store.png', width: 400, height: 840},
        mobileImageAlt: 'Storefront mobile screenshot',
      }} />,
    );
    expect(html).toContain('data-slot="creator-screenshot-frame"');
    expect(html).toContain('/images/desktop-store.png');
    expect(html).toContain('/images/mobile-store.png');
    expect(html).toContain('Storefront builder desktop screenshot');
    expect(html).toContain('Storefront mobile screenshot');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('<h2');
    expect(html).toContain('A storefront that looks like you');
  });

  it('shows a single checkout screenshot with no phone overlay when not uploaded', () => {
    const html = renderToStaticMarkup(
      <FeatureWithScreenshot config={{
        ...base,
        mediaVariant: 'checkout',
        imageAlt: 'Illustrative Chapa checkout',
      }} />,
    );
    expect(html).toContain('data-slot="creator-screenshot-frame"');
    expect(html).toContain('Illustrative Chapa checkout');
    expect(html).not.toContain('mobile-store.png');
  });

  it('keeps existing standard screenshot rendering for older configurations', () => {
    const html = renderToStaticMarkup(
      <FeatureWithScreenshot config={{...base, mediaVariant: 'standard'}} />,
    );
    expect(html).not.toContain('data-slot="creator-screenshot-frame"');
    expect(html).toContain('/images/desktop-store.png');
  });
});

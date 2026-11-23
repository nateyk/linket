import {LandingPageContext} from '@common/ui/landing-page/landing-page-context';
import {HeroSplitWithScreenshot} from '@common/ui/landing-page/hero/hero-split-with-screenshot';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';

vi.mock('@ui/themes/use-is-dark-mode', () => ({
  useIsDarkMode: () => false,
}));
vi.mock('@ui/i18n/trans', () => ({
  Trans: ({message}: {message: string}) => message,
}));
vi.mock('@common/ui/navigation/navbar/logo', () => ({
  Logo: () => null,
}));

function renderHero(presentation?: 'creator', collage = false) {
  return renderToStaticMarkup(
    <LandingPageContext.Provider value={{defaultIcons: {}, sections: []}}>
      <HeroSplitWithScreenshot
        config={{
          name: 'hero-split-with-screenshot',
          presentation,
          badge: 'Creator storefront',
          title: 'Create your storefront. Sell what you make.',
          image: {
            src: 'images/landing/creator-hero.svg',
            width: 1280,
            height: 880,
          },
          supportingImages: collage
            ? [
                {src: 'images/landing/creator-storefront.svg'},
                {src: 'images/landing/creator-checkout.svg'},
              ]
            : undefined,
        }}
      />
    </LandingPageContext.Provider>,
  );
}

describe('Linket homepage hero background', () => {
  it('uses the original subtle grid and blue glow without the dot texture', () => {
    const html = renderHero('creator');

    expect(html).toContain('Create your storefront. Sell what you make.');
    expect(html).toContain('images/landing/creator-hero.svg');
    expect(html).not.toContain('mask-[radial-gradient(');
    expect(html).toContain('blur-3xl');
    expect(html).toContain('bg-linear-to-r');
    expect(html).not.toContain('linket-creator-dots');
    expect(html).not.toContain('<circle');
  });

  it('renders the three-image creator collage only when both supporting images exist', () => {
    const html = renderHero('creator', true);

    expect(html).toContain('images/landing/creator-hero.svg');
    expect(html).toContain('images/landing/creator-storefront.svg');
    expect(html).toContain('images/landing/creator-checkout.svg');
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toContain('<circle');
  });

  it('retains the grid and glow for standard non-creator heroes', () => {
    const html = renderHero();

    expect(html).toContain('mask-[radial-gradient(');
    expect(html).toContain('blur-3xl');
    expect(html).not.toContain('linket-creator-dots');
  });
});

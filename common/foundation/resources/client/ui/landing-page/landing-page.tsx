import {AdHost} from '@common/admin/ads/ad-host';
import {useSettingsPreviewMode} from '@common/admin/settings/preview/use-settings-preview-mode';
import {DefaultMetaTags} from '@common/seo/default-meta-tags';
import {CtaSimpleCentered} from '@common/ui/landing-page/cta/cta-simple-centered';
import {LandingPageFaq} from '@common/ui/landing-page/faq/landing-page-faq';
import {FeatureWithScreenshot} from '@common/ui/landing-page/features/feature-with-screenshot';
import FeaturesGrid from '@common/ui/landing-page/features/features-grid';
import {LandingPageFooter} from '@common/ui/landing-page/footer/landing-page-footer';
import {HeroSimpleCentered} from '@common/ui/landing-page/hero/hero-simple-centered';
import {HeroSplitWithScreenshot} from '@common/ui/landing-page/hero/hero-split-with-screenshot';
import {HeroWithBackgroundImage} from '@common/ui/landing-page/hero/hero-with-background-image';
import {SectionConfig} from '@common/ui/landing-page/landing-page-config';
import {LandingPageContext} from '@common/ui/landing-page/landing-page-context';
import {LandingPagePricing} from '@common/ui/landing-page/pricing/landing-page-pricing';
import {Header} from '@common/ui/landing-page/header/header';
import {useSettings} from '@ui/settings/use-settings';
import {use} from 'react';
import {Fragment} from 'react/jsx-runtime';

export function LandingPage() {
  const isPreview = useSettingsPreviewMode().isInsideSettingsPreview;
  const {landingPage} = useSettings();
  const {sections: contextSections, adSlotAfterHero} = use(LandingPageContext);

  // in landing page editor we'll be editing section config in settings, so we need
  // to use that instead of landing page data query to get live preview updates
  const sections =
    isPreview && landingPage?.sections ? landingPage.sections : contextSections;

  const heroAdSlotIndex = adSlotAfterHero
    ? sections.findIndex(s => s.name.startsWith('hero-'))
    : null;

  const anchors = buildSectionAnchors(sections);

  return (
    <div>
      <Header sections={sections} anchors={anchors} />
      <DefaultMetaTags />
      {sections.map((section, index) => (
        <Fragment key={index}>
          <div id={anchors[index]}>
            <Section config={section} index={index} />
          </div>
          {heroAdSlotIndex === index && adSlotAfterHero && (
            <AdHost slot={adSlotAfterHero} className="px-8" />
          )}
        </Fragment>
      ))}
    </div>
  );
}

// Sections are configurable, so anchors are derived from their content rather
// than hardcoded. Header and footer nav link against these ids, and every id is
// de-duplicated so repeated section types still yield unique targets.
function buildSectionAnchors(sections: SectionConfig[]): (string | undefined)[] {
  const seen = new Set<string>();

  return sections.map(section => {
    // The pricing section renders its own `pricing-section` id, which the hero
    // CTA already targets.
    if (section.name === 'pricing') return undefined;

    const {title, badge, name} = section as SectionConfig & {
      title?: string;
      badge?: string;
    };
    const slug = slugifySectionTitle(title || badge || name);
    if (!slug) return undefined;

    let anchor = slug;
    let suffix = 1;
    while (seen.has(anchor)) {
      anchor = `${slug}-${++suffix}`;
    }
    seen.add(anchor);
    return anchor;
  });
}

function slugifySectionTitle(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

type SectionProps = {
  config: SectionConfig;
  index: number;
};
function Section({config, index}: SectionProps) {
  const {sectionRenderers} = use(LandingPageContext);
  switch (config.name) {
    case 'hero-split-with-screenshot':
      return <HeroSplitWithScreenshot config={config} />;
    case 'hero-with-background-image':
      return <HeroWithBackgroundImage config={config} />;
    case 'hero-simple-centered':
      return <HeroSimpleCentered config={config} />;
    case 'feature-with-screenshot':
      return <FeatureWithScreenshot config={config} />;
    case 'features-grid':
      return <FeaturesGrid config={config} />;
    case 'faq':
      return <LandingPageFaq config={config} />;
    case 'cta-simple-centered':
      return <CtaSimpleCentered config={config} />;
    case 'pricing':
      return <LandingPagePricing config={config} />;
    case 'footer':
      return <LandingPageFooter config={config} />;
    default: {
      const Renderer = sectionRenderers?.[(config as any).name];
      if (!Renderer) {
        return null;
      }
      return <Renderer config={config} index={index} />;
    }
  }
}

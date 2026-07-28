import type {MenuItemConfig} from '@common/menus/menu-config';
import type {CtaSimpleCenteredConfig} from '@common/ui/landing-page/cta/cta-simple-centered';
import type {LandingPageFaqConfig} from '@common/ui/landing-page/faq/landing-page-faq';
import type {FeatureWithScreenshotConfig} from '@common/ui/landing-page/features/feature-with-screenshot';
import type {FeaturesGridConfig} from '@common/ui/landing-page/features/features-grid';
import type {LandingPageFooterConfig} from '@common/ui/landing-page/footer/landing-page-footer';
import {HeroSimpleCenteredConfig} from '@common/ui/landing-page/hero/hero-simple-centered';
import type {HeroSplitWithScreenshotConfig} from '@common/ui/landing-page/hero/hero-split-with-screenshot';
import type {HeroWithBackgroundImageConfig} from '@common/ui/landing-page/hero/hero-with-background-image';
import type {LandingPagePricingConfig} from '@common/ui/landing-page/pricing/landing-page-pricing';
import {ButtonColor, ButtonVariant} from '@shadcn/button/button';

export type LandingPageButtonConfig = MenuItemConfig & {
  variant: ButtonVariant;
  color: ButtonColor;
};

export type LandingPageImageConfig = {
  src: string;
  width?: number;
  height?: number;
};

export type SectionConfig =
  | HeroSplitWithScreenshotConfig
  | HeroWithBackgroundImageConfig
  | HeroSimpleCenteredConfig
  | FeatureWithScreenshotConfig
  | FeaturesGridConfig
  | LandingPageFaqConfig
  | CtaSimpleCenteredConfig
  | LandingPagePricingConfig
  | LandingPageFooterConfig;

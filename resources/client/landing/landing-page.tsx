import {sharedDashboardIcons} from '@app/dashboard/layout/sidenav/dashboard-sidebar-icons';
import {LandingPageStats} from '@app/landing/landing-page-stats';
import {useLandingPageData} from '@app/landing/use-landing-page-data';
import {LandingPage as CommonLandingPage} from '@common/ui/landing-page/landing-page';
import {LandingPageContext} from '@common/ui/landing-page/landing-page-context';
import {buttonVariants, LinkButton} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {
  ALargeSmallIcon,
  ArrowLeftRightIcon,
  ArrowRightIcon,
  CalendarIcon,
  ChartColumnBigIcon,
  FastForwardIcon,
  GripVerticalIcon,
  KeyIcon,
  SettingsIcon,
  SwatchBookIcon,
} from 'lucide-react';
import {ComponentType} from 'react';

const defaultIcons = {
  ...sharedDashboardIcons,
  insights: <ChartColumnBigIcon />,
  back_half: <ALargeSmallIcon />,
  settings: <SettingsIcon />,
  retargeting: <ArrowLeftRightIcon />,
  api: <KeyIcon />,
  'drag-handle': <GripVerticalIcon />,
  brand: <SwatchBookIcon />,
  date: <CalendarIcon />,
  fast: <FastForwardIcon />,
};

const sectionRenderers: Record<
  string,
  ComponentType<{config: any; index: number}>
> = {
  stats: LandingPageStats,
};

function HeroCallToAction() {
  return (
    <div className="flex flex-wrap gap-3">
      <LinkButton
        to="/register"
        variant="default"
        color="primary"
        size="lg"
        className="h-12 p-3"
      >
        <Trans message="Get started for free" />
        <ArrowRightIcon />
      </LinkButton>
      <a
        className={cn(
          buttonVariants({
            variant: 'outline',
            color: 'default',
            size: 'lg',
          }),
          // The hero CTA slot renders inside a forced `.light` island, which
          // pins light-scheme tokens even when the page ground is dark. Mirror
          // the dark-scheme outline colors so the label/border stay legible on
          // the dark ground (WCAG AA 4.5:1).
          'h-12 min-w-22 p-3 dark:text-white dark:hover:bg-white/10 dark:data-pressed:bg-white/10',
        )}
        href="#pricing-section"
        onClick={e => {
          e.preventDefault();
          const pricingSection = document.getElementById('pricing-section');
          if (pricingSection) {
            pricingSection.scrollIntoView({behavior: 'smooth'});
          }
        }}
      >
        <Trans message="Pricing" />
      </a>
    </div>
  );
}

export function Component() {
  const query = useLandingPageData();

  return (
    <LandingPageContext.Provider
      value={{
        defaultIcons,
        sections: query.data.sections ?? [],
        sectionRenderers,
        heroSearchBarSlot: HeroCallToAction,
        adSlotAfterHero: 'landing',
      }}
    >
      <CommonLandingPage />
    </LandingPageContext.Provider>
  );
}

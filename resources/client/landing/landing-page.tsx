import {sharedDashboardIcons} from '@app/dashboard/layout/sidenav/dashboard-sidebar-icons';
import {LandingPageStats} from '@app/landing/landing-page-stats';
import {useLandingPageData} from '@app/landing/use-landing-page-data';
import {LandingPage as CommonLandingPage} from '@common/ui/landing-page/landing-page';
import {LandingPageContext} from '@common/ui/landing-page/landing-page-context';
import {
  ALargeSmallIcon,
  ArrowLeftRightIcon,
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

export function Component() {
  const query = useLandingPageData();

  return (
    <LandingPageContext.Provider
      value={{
        defaultIcons,
        sections: query.data.sections ?? [],
        sectionRenderers,
        adSlotAfterHero: 'landing',
      }}
    >
      <CommonLandingPage />
    </LandingPageContext.Provider>
  );
}

import {sharedDashboardIcons} from '@app/dashboard/layout/sidenav/dashboard-sidebar-icons';
import {LandingPageStats} from '@app/landing/landing-page-stats';
import {useLandingPageData} from '@app/landing/use-landing-page-data';
import {LandingPage as CommonLandingPage} from '@common/ui/landing-page/landing-page';
import {LandingPageContext} from '@common/ui/landing-page/landing-page-context';
import {Button, buttonVariants} from '@shadcn/button/button';
import {Field} from '@shadcn/forms/field';
import {Input} from '@shadcn/forms/input/input';
import {message} from '@ui/i18n/message';
import {Trans} from '@ui/i18n/trans';
import {useTrans} from '@ui/i18n/use-trans';
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
import {ComponentType, useState} from 'react';
import {useNavigate} from 'react-router';

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

function HeroShortenLink() {
  const navigate = useNavigate();
  const {trans} = useTrans();
  const [longUrl, setLongUrl] = useState('');

  return (
    <form
      className="flex w-full flex-col gap-4 text-foreground"
      onSubmit={e => {
        e.preventDefault();

        if (longUrl) {
          navigate(
            `register?data=${btoa(JSON.stringify({long_url: longUrl}))}`,
          );
        } else {
          navigate(`register`);
        }
      }}
    >
      <Field.Root>
        <Input
          type="url"
          className="h-14 border-foreground/20 md:text-base dark:border-input/30 dark:bg-input/15"
          placeholder={trans(message('Paste your long link here'))}
          value={longUrl}
          onChange={e => setLongUrl(e.target.value)}
        />
        <Field.Error />
      </Field.Root>
      <div className="flex gap-3">
        <Button
          type="submit"
          variant="default"
          color="primary"
          size="lg"
          className="h-12 p-3"
        >
          <Trans message="Get started for free" />
          <ArrowRightIcon />
        </Button>
        <a
          className={cn(
            buttonVariants({
              variant: 'outline',
              color: 'default',
              size: 'lg',
            }),
            'h-12 min-w-22 p-3',
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
    </form>
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
        heroSearchBarSlot: HeroShortenLink,
        adSlotAfterHero: 'landing',
      }}
    >
      <CommonLandingPage />
    </LandingPageContext.Provider>
  );
}

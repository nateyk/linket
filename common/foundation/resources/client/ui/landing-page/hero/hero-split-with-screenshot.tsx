import {BaseHeroConfig} from '@common/ui/landing-page/hero/base-hero-config';
import {
  BgColors,
  Buttons,
  Description,
  Heading,
} from '@common/ui/landing-page/hero/shared';
import {LandingPageContext} from '@common/ui/landing-page/landing-page-context';
import {Logo} from '@common/ui/navigation/navbar/logo';
import {Trans} from '@ui/i18n/trans';
import {useIsDarkMode} from '@ui/themes/use-is-dark-mode';
import {cn} from '@ui/utils/cn';
import {useContext} from 'react';

export type HeroSplitWithScreenshotConfig = BaseHeroConfig & {
  name: 'hero-split-with-screenshot';
};

type Props = {
  config: HeroSplitWithScreenshotConfig;
};
export function HeroSplitWithScreenshot({config}: Props) {
  const {heroSearchBarSlot} = useContext(LandingPageContext);
  const SearchBarCmp = config.showSearchBarSlot
    ? (heroSearchBarSlot ?? null)
    : null;
  const siteIsInDarkMode = useIsDarkMode();
  const isDarkMode = siteIsInDarkMode || config.forceDarkMode;
  return (
    <div
      className={cn(
        'relative isolate overflow-hidden bg-background text-foreground',
        config.showAsPanel && 'm-2 rounded-3xl',
        config.forceDarkMode && 'dark',
      )}
    >
      <GridDecoration />
      <ColorSplash />
      {config.bgColors ? <BgColors config={config} /> : null}
      <div className="mx-auto max-w-7xl px-6 pt-10 pb-24 sm:pb-32 lg:flex lg:px-8 lg:py-40">
        <div className="mx-auto max-w-2xl lg:mx-0 lg:shrink-0 lg:pt-8">
          <Logo
            className="h-10"
            color={isDarkMode ? 'light' : 'dark'}
            url="/"
          />
          {config.badge ? (
            <div className="mt-24 w-max rounded-full bg-primary/10 px-3 py-1 text-sm/6 font-semibold text-primary ring-1 ring-primary/10 ring-inset sm:mt-32 lg:mt-16">
              <Trans message={config.badge} />
            </div>
          ) : null}
          {config.title ? (
            <Heading className="mt-10">
              <Trans message={config.title} />
            </Heading>
          ) : null}
          {config.description ? (
            <Description className="mt-8">
              <Trans message={config.description} />
            </Description>
          ) : null}
          {SearchBarCmp ? (
            <div className="light mt-10 pb-12.5 text-muted-foreground">
              <SearchBarCmp background="bg-white" config={config} />
            </div>
          ) : null}
          {config.buttons?.length ? (
            <Buttons buttons={config.buttons} className="mt-10 gap-x-4" />
          ) : null}
        </div>
        {config.image ? (
          <div className="mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:mt-0 lg:mr-0 lg:ml-10 lg:max-w-none lg:flex-none xl:ml-32">
            <div className="max-w-3xl flex-none sm:max-w-5xl lg:max-w-none">
              <div className="-m-2 rounded-2xl border bg-muted/60 p-2 lg:-m-4 lg:rounded-3xl lg:p-4">
                <img
                  alt=""
                  src={config.image.src}
                  width={config.image.width}
                  height={config.image.height}
                  className="w-304 rounded-md border shadow-2xl"
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function GridDecoration() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 -z-10 size-full mask-[radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-border"
    >
      <defs>
        <pattern
          x="50%"
          y={-1}
          id="0787a7c5-978c-4f66-83c7-11c213f99cb7"
          width={200}
          height={200}
          patternUnits="userSpaceOnUse"
        >
          <path d="M.5 200V.5H200" fill="none" />
        </pattern>
      </defs>
      <svg x="50%" y="-1" className="overflow-visible fill-muted">
        <path
          d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
          strokeWidth={0}
        ></path>
      </svg>
      <rect
        fill="url(#0787a7c5-978c-4f66-83c7-11c213f99cb7)"
        width="100%"
        height="100%"
        strokeWidth={0}
      />
    </svg>
  );
}

function ColorSplash() {
  return (
    <div
      aria-hidden="true"
      className="absolute top-2.5 left-[calc(50%-4rem)] -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:top-[calc(50%-30rem)] lg:left-12 xl:left-[calc(50%-24rem)]"
    >
      <div
        className="aspect-1108/632 w-277 bg-linear-to-r from-primary/25 to-primary opacity-40"
        style={{
          clipPath:
            'polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)',
        }}
      ></div>
    </div>
  );
}

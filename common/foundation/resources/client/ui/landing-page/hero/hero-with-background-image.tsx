import {BaseHeroConfig} from '@common/ui/landing-page/hero/base-hero-config';
import {
  BgColors,
  Buttons,
  Description,
  Heading,
} from '@common/ui/landing-page/hero/shared';
import {LandingPageContext} from '@common/ui/landing-page/landing-page-context';
import {Navbar} from '@common/ui/navigation/navbar/navbar';
import {Trans} from '@ui/i18n/trans';
import {useIsDarkMode} from '@ui/themes/use-is-dark-mode';
import clsx from 'clsx';
import {useContext} from 'react';

export type HeroWithBackgroundImageConfig = BaseHeroConfig & {
  name: 'hero-with-background-image';
};

type Props = {
  config: HeroWithBackgroundImageConfig;
};
export function HeroWithBackgroundImage({config}: Props) {
  const {heroSearchBarSlot} = useContext(LandingPageContext);
  const SearchBarCmp = config.showSearchBarSlot
    ? (heroSearchBarSlot ?? null)
    : null;
  const siteIsInDarkMode = useIsDarkMode();
  const isDarkMode = siteIsInDarkMode || config.forceDarkMode;

  return (
    <div
      className={clsx(
        'overflow-hidden bg-muted text-foreground',
        config.showAsPanel && 'm-2 rounded-3xl',
        config.forceDarkMode && 'dark',
      )}
    >
      <Navbar.Root className="absolute inset-x-0 top-0 z-50 m-3 min-h-20 bg-transparent">
        <Navbar.Logo color={isDarkMode ? 'light' : 'dark'} url="/" />
        <Navbar.Menu position="landing-page-navbar" />
        <Navbar.Content className="ml-auto">
          <Navbar.AuthContent />
        </Navbar.Content>
      </Navbar.Root>

      <div className="relative isolate overflow-hidden pt-14">
        {config.image ? (
          <img
            alt=""
            src={config.image?.src}
            width={config.image?.width}
            height={config.image?.height}
            className="absolute inset-0 -z-20 size-full object-cover"
          />
        ) : null}
        {config.bgColors ? <BgColors config={config} /> : null}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-[calc(50%-11rem)] aspect-1155/678 w-145 -translate-x-1/2 rotate-30 bg-linear-to-tr from-primary/25 to-primary opacity-25 sm:left-[calc(50%-30rem)] sm:w-237.5"
          />
        </div>
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div
            className={clsx(
              'mx-auto max-w-2xl',
              SearchBarCmp ? 'py-32 sm:py-36' : 'py-32 sm:py-48 lg:py-56',
            )}
          >
            {config.badge ? (
              <div className="hidden sm:mb-8 sm:flex sm:justify-center">
                <div className="relative rounded-full border px-3 py-1 text-sm/6">
                  <Trans message={config.badge} />
                </div>
              </div>
            ) : null}
            <div className="text-center">
              {config.title ? (
                <Heading>
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
                <Buttons
                  buttons={config.buttons}
                  className="mt-10 justify-center gap-x-6"
                />
              ) : null}
            </div>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-[calc(50%+3rem)] aspect-1155/678 w-144.5 -translate-x-1/2 bg-linear-to-tr from-primary/25 to-primary opacity-25 sm:left-[calc(50%+36rem)] sm:w-288.5"
          />
        </div>
      </div>
    </div>
  );
}

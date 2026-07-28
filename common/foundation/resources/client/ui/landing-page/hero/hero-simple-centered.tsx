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
import {cn} from '@ui/utils/cn';
import {useContext} from 'react';

export type HeroSimpleCenteredConfig = BaseHeroConfig & {
  name: 'hero-simple-centered';
};

type Props = {
  config: HeroSimpleCenteredConfig;
};
export function HeroSimpleCentered({config}: Props) {
  const {heroSearchBarSlot} = useContext(LandingPageContext);
  const SearchBarCmp = config.showSearchBarSlot
    ? (heroSearchBarSlot ?? null)
    : null;
  const siteIsInDarkMode = useIsDarkMode();
  const isDarkMode = siteIsInDarkMode || config.forceDarkMode;

  return (
    <div
      className={cn(
        'isolate bg-background text-foreground',
        config.forceDarkMode && 'dark',
        config.showAsPanel
          ? 'm-2 overflow-hidden rounded-3xl border border-border/80 shadow-xs'
          : 'overflow-visible',
      )}
    >
      <Navbar.Root className="absolute inset-x-0 top-0 z-50 m-3 min-h-20 bg-transparent text-foreground">
        <Navbar.Logo color={isDarkMode ? 'light' : 'dark'} url="/" />
        <Navbar.Menu position="landing-page-navbar" />
        <Navbar.Content className="ml-auto">
          <Navbar.AuthContent />
        </Navbar.Content>
      </Navbar.Root>

      {config.bgColors ? <BgColors config={config} /> : null}

      <div className="relative isolate px-6 pt-14 lg:px-8">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-[calc(50%-11rem)] aspect-1155/678 w-144.5 -translate-x-1/2 rotate-30 bg-linear-to-tr from-primary/25 to-primary opacity-30 sm:left-[calc(50%-30rem)] sm:w-288.75"
          />
        </div>
        <div
          className={cn(
            'mx-auto max-w-2xl',
            config.image ? 'pt-32' : 'py-32 sm:py-48 lg:py-56',
          )}
        >
          {config.badge ? (
            <div className="hidden sm:mb-8 sm:flex sm:justify-center">
              <div className="w-max rounded-full bg-primary/10 px-3 py-1 text-sm/6 font-semibold text-primary ring-1 ring-primary/10 ring-inset">
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
              <div className="mt-10 pb-12.5">
                <SearchBarCmp background="bg-card" config={config} />
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
        {config.image ? (
          <div className="mx-auto mt-16 mb-40 flow-root w-max max-w-350 sm:mt-24">
            <div className="rounded-2xl border bg-muted p-2 lg:rounded-3xl lg:p-4">
              <img
                alt=""
                src={config.image?.src}
                width={config.image?.width}
                height={config.image?.height}
                className="rounded-md border shadow-2xl"
              />
            </div>
          </div>
        ) : null}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
        >
          <div
            style={{
              clipPath:
                'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
            }}
            className="relative left-[calc(50%+3rem)] aspect-1155/678 w-144.5 -translate-x-1/2 bg-linear-to-tr from-primary/25 to-primary opacity-30 sm:left-[calc(50%+36rem)] sm:w-288.75"
          />
        </div>
      </div>
    </div>
  );
}

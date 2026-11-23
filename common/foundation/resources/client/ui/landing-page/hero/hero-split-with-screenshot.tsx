import {BaseHeroConfig} from '@common/ui/landing-page/hero/base-hero-config';
import {
  BgColors,
  Buttons,
  Description,
  Heading,
} from '@common/ui/landing-page/hero/shared';
import {LandingPageContext} from '@common/ui/landing-page/landing-page-context';
import type {LandingPageImageConfig} from '@common/ui/landing-page/landing-page-config';
import {Logo} from '@common/ui/navigation/navbar/logo';
import {Trans} from '@ui/i18n/trans';
import {useIsDarkMode} from '@ui/themes/use-is-dark-mode';
import {cn} from '@ui/utils/cn';
import {motion, useReducedMotion} from 'framer-motion';
import {useContext} from 'react';

export type HeroSplitWithScreenshotConfig = BaseHeroConfig & {
  name: 'hero-split-with-screenshot';
  supportingImages?: LandingPageImageConfig[];
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
  const creator = config.presentation === 'creator';
  const isDarkMode = siteIsInDarkMode || config.forceDarkMode;
  return (
    <div
      className={cn(
        'relative isolate overflow-hidden bg-background text-foreground',
        config.showAsPanel && 'm-2 rounded-3xl',
        config.forceDarkMode && 'dark',
      )}
    >
      {!creator && <GridDecoration />}
      <ColorSplash />
      {config.bgColors ? <BgColors config={config} /> : null}
      <div className={creator ? "mx-auto grid max-w-7xl items-center gap-10 px-5 py-14 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:py-24" : "mx-auto max-w-7xl px-6 pt-10 pb-24 sm:pb-32 lg:flex lg:px-8 lg:py-40"}>
        <div className="mx-auto max-w-2xl lg:mx-0 lg:shrink-0 lg:pt-8">
          {!creator && <Logo className="h-10" color={isDarkMode ? 'light' : 'dark'} url="/" />}
          {config.badge ? (
            <div className={cn("w-max max-w-full rounded-full bg-primary/10 px-3 py-1.5 text-sm/6 font-semibold text-primary ring-1 ring-primary/10 ring-inset", creator ? "mt-2" : "mt-24 sm:mt-32 lg:mt-16")}>
              <Trans message={config.badge} />
            </div>
          ) : null}
          {config.title ? (
            <Heading className={creator ? "mt-6 max-w-2xl text-4xl! leading-[1.08]! sm:text-6xl!" : "mt-10"}>
              <Trans message={config.title} />
            </Heading>
          ) : null}
          {config.description ? (
            <Description className={creator ? "mt-5 max-w-xl text-base! font-normal! sm:text-lg!" : "mt-8"}>
              <Trans message={config.description} />
            </Description>
          ) : null}
          {SearchBarCmp && !config.buttons?.length ? (
            <div className="light mt-10 pb-12.5 text-muted-foreground">
              <SearchBarCmp background="bg-white" config={config} />
            </div>
          ) : null}
          {config.buttons?.length ? (
            <Buttons buttons={config.buttons} className="mt-8 flex-wrap gap-3" />
          ) : null}
        </div>
        {config.image ? (
          <div className={creator ? "mx-auto w-full min-w-0 max-w-full" : "mx-auto mt-16 flex max-w-2xl sm:mt-24 lg:mt-0 lg:mr-0 lg:ml-10 lg:max-w-none lg:flex-none xl:ml-32"}>
            <div className={creator ? "w-full min-w-0" : "max-w-3xl flex-none sm:max-w-5xl lg:max-w-none"}>
              {creator && config.supportingImages?.[0]?.src && config.supportingImages?.[1]?.src ? (
                <CreatorHeroCollage
                  image={config.image}
                  supportingImages={config.supportingImages}
                />
              ) : (
                <div className={creator ? "overflow-hidden rounded-2xl border border-primary/10 bg-background/75 p-2 shadow-xl" : "-m-2 rounded-2xl border bg-muted/60 p-2 lg:-m-4 lg:rounded-3xl lg:p-4"}>
                  <img
                    alt=""
                    src={config.image.src}
                    width={config.image.width}
                    height={config.image.height}
                    className={creator ? "block h-auto w-full rounded-xl" : "w-304 rounded-md border shadow-2xl"}
                  />
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

type CreatorHeroCollageProps = {
  image: LandingPageImageConfig;
  supportingImages: LandingPageImageConfig[];
};

// The storefront image remains the focus. Two optional supporting images can
// be replaced independently in the landing-page editor. The static image
// fallback above remains available for existing/customized landing pages.
function CreatorHeroCollage({
  image,
  supportingImages,
}: CreatorHeroCollageProps) {
  const reducedMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="relative isolate mx-auto aspect-[5/4] w-full max-w-152 sm:aspect-[6/5] lg:aspect-[5/4]"
    >
      <div className="pointer-events-none absolute inset-[12%_8%] -z-10 rounded-full bg-primary/10 blur-3xl" />
      <motion.div
        initial={false}
        animate={reducedMotion ? undefined : {y: [0, -3, 0]}}
        transition={{duration: 8, repeat: Infinity, ease: 'easeInOut'}}
        className="absolute top-[7%] left-[4%] z-0 w-[49%] -rotate-6 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-lg"
      >
        <img
          src={supportingImages[0].src}
          alt=""
          width={supportingImages[0].width}
          height={supportingImages[0].height}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full rounded-xl object-cover"
        />
      </motion.div>
      <motion.div
        initial={false}
        animate={reducedMotion ? undefined : {y: [0, 3, 0]}}
        transition={{duration: 10, repeat: Infinity, ease: 'easeInOut'}}
        className="absolute top-[4%] right-[3%] z-10 w-[46%] rotate-6 overflow-hidden rounded-2xl border border-border bg-card p-1.5 shadow-lg"
      >
        <img
          src={supportingImages[1].src}
          alt=""
          width={supportingImages[1].width}
          height={supportingImages[1].height}
          loading="lazy"
          decoding="async"
          className="aspect-[4/3] w-full rounded-xl object-cover"
        />
      </motion.div>
      <div className="absolute inset-x-[7%] bottom-[7%] z-20 overflow-hidden rounded-2xl border border-primary/15 bg-background p-1.5 shadow-xl sm:p-2">
        <img
          src={image.src}
          alt=""
          width={image.width}
          height={image.height}
          decoding="async"
          className="block h-auto w-full rounded-xl"
        />
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
      <div className="aspect-1108/632 w-277 rounded-[42%_58%_46%_54%] bg-linear-to-r from-primary/25 to-primary opacity-40" />
    </div>
  );
}


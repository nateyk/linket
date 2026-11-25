import {Buttons} from '@common/ui/landing-page/hero/shared';
import {LandingPageButtonConfig} from '@common/ui/landing-page/landing-page-config';
import {Trans} from '@ui/i18n/trans';
import clsx from 'clsx';

export type CtaSimpleCenteredConfig = {
  name: 'cta-simple-centered';
  title?: string;
  description?: string;
  buttons?: LandingPageButtonConfig[];
  forceDarkMode?: boolean;
  presentation?: 'starfield';
};

type Props = {
  config: CtaSimpleCenteredConfig;
};

export function CtaSimpleCentered({config}: Props) {
  const sparse = config.presentation === 'starfield';
  return (
    <div
      className={clsx(
        'mx-auto max-w-7xl px-6 py-12 text-foreground sm:py-16 lg:px-8',
        config.forceDarkMode && 'dark',
      )}
    >
      <div className={clsx(
        'relative isolate overflow-hidden border border-border/80 px-6 shadow-sm sm:rounded-3xl sm:px-6',
        sparse
          ? 'bg-linear-to-br from-primary/10 via-background to-primary/15 py-16 sm:py-20'
          : 'bg-muted/40 py-24 dark:bg-card',
      )}>
        {sparse ? <SparseStarfield /> : null}
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          {config.title ? (
            <h2 className="text-4xl font-semibold tracking-tight text-balance text-foreground sm:text-5xl">
              <Trans message={config.title} />
            </h2>
          ) : null}
          {config.description ? (
            <p className="mx-auto mt-6 max-w-xl text-lg/8 text-pretty text-muted-foreground">
              <Trans message={config.description} />
            </p>
          ) : null}
          {config.buttons?.length ? (
            <Buttons
              buttons={config.buttons}
              className="mt-10 flex items-center justify-center gap-x-6"
            />
          ) : null}
          {!sparse ? <Gradient /> : null}
        </div>
      </div>
    </div>
  );
}

function Gradient() {
  return (
    <svg
      viewBox="0 0 1024 1024"
      aria-hidden="true"
      className="absolute top-1/2 left-1/2 -z-10 size-256 -translate-x-1/2 mask-[radial-gradient(closest-side,white,transparent)]"
    >
      <circle
        r={512}
        cx={512}
        cy={512}
        fill="url(#827591b1-ce8c-4110-b064-7cb85a0b1217)"
        fillOpacity="0.7"
      />
      <defs>
        <radialGradient id="827591b1-ce8c-4110-b064-7cb85a0b1217">
          <stop stopColor="color-mix(in oklab, var(--be-primary) 25%, transparent)" />
          <stop offset={1} stopColor="var(--be-primary)" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/**
 * Sparse, decorative starfield with zero JavaScript, GPU canvas, or network
 * traffic. The background stays usable on reduced-motion and low-end devices.
 * All content remains in the normal DOM and above the effect.
 */
function SparseStarfield() {
  const stars: [number, number, number][] = [
    [36, 30, 1.5], [92, 78, 2], [166, 18, 1], [222, 96, 1.5],
    [286, 44, 1.2], [352, 125, 1], [412, 30, 1.8], [476, 88, 1],
    [522, 22, 1.4], [584, 112, 1.4], [646, 36, 1], [702, 102, 1.9],
    [765, 20, 1.2], [824, 74, 1.8], [884, 27, 1], [948, 108, 1.4],
    [66, 265, 1.2], [142, 324, 1.8], [226, 276, 1.2], [313, 346, 1],
    [402, 281, 1.5], [504, 343, 1], [612, 282, 1.9], [718, 347, 1.1],
    [810, 267, 1.5], [923, 328, 1.2],
  ];

  return (
    <svg
      data-slot="cta-starfield"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 size-full text-primary/45"
      viewBox="0 0 1024 380"
      preserveAspectRatio="xMidYMid slice"
    >
      {stars.map(([x, y, radius], i) => (
        <circle key={i} cx={x} cy={y} r={radius} fill="currentColor" />
      ))}
      <path
        d="M96 198h20m-10-10v20M890 184h16m-8-8v16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        className="motion-safe:animate-pulse motion-reduce:animate-none"
      />
    </svg>
  );
}

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
};

type Props = {
  config: CtaSimpleCenteredConfig;
};

export function CtaSimpleCentered({config}: Props) {
  return (
    <div
      className={clsx(
        'mx-auto max-w-7xl px-6 py-12 text-foreground sm:py-16 lg:px-8',
        config.forceDarkMode && 'dark',
      )}
    >
      <div className="relative isolate overflow-hidden border border-border/80 bg-muted/40 px-6 py-24 shadow-sm sm:rounded-3xl sm:px-6 dark:bg-card">
        <div className="mx-auto max-w-2xl text-center">
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
          <Gradient />
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

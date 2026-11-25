import {ConfigIconWithBg} from '@common/ui/landing-page/config-icon';
import type {LandingPageImageConfig} from '@common/ui/landing-page/landing-page-config';
import {Trans} from '@ui/i18n/trans';
import {IconTree} from '@ui/icons/create-svg-icon';
import {cn} from '@ui/utils/cn';

export type FeaturesGridConfig = {
  name: 'features-grid';
  presentation?: 'journey' | 'catalog';
  title?: string;
  badge?: string;
  description?: string;
  maxColumns?: number;
  iconsOnTop?: boolean;
  mutedBg?: boolean;
  features?: {
    title: string;
    description: string;
    icon?: string | IconTree[];
    image?: LandingPageImageConfig;
  }[];
};

type FeaturesGridProps = {
  config: FeaturesGridConfig;
};
export default function FeaturesGrid({config}: FeaturesGridProps) {
  if (config.presentation === 'journey') {
    return <CreatorJourney config={config} />;
  }
  if (config.presentation === 'catalog') {
    return <CreatorProductCatalog config={config} />;
  }

  return (
    <div
      className={cn(
        'py-24 sm:py-32',
        config.mutedBg && 'bg-muted/40 dark:bg-card',
      )}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          {config.badge ? (
            <p className="text-base/7 font-semibold text-primary">
              <Trans message={config.badge} />
            </p>
          ) : null}
          {config.title ? (
            <h2 className="mt-2 text-4xl font-semibold tracking-tight text-pretty text-foreground sm:text-5xl lg:text-balance">
              <Trans message={config.title} />
            </h2>
          ) : null}
          {config.description ? (
            <p className="mt-6 text-lg/8 text-muted-foreground">
              <Trans message={config.description} />
            </p>
          ) : null}
        </div>
        <div
          className={cn(
            'mx-auto mt-16 sm:mt-20 lg:mt-24',
            `${config.maxColumns}` === '2' && 'max-w-2xl lg:max-w-4xl',
          )}
        >
          <dl
            className={cn(
              'mx-auto grid max-w-xl grid-cols-1 sm:grid-cols-2 lg:max-w-none',
              getColumnsClassName(config.maxColumns),
              `${config.maxColumns}` === '3' ? 'gap-17.5' : 'gap-10',
            )}
          >
            {config.features?.map(feature => (
              <div
                key={feature.title}
                className={cn(
                  'flex gap-x-6 gap-y-3',
                  config.iconsOnTop && 'flex-col items-center',
                )}
              >
                {feature.icon ? <ConfigIconWithBg icon={feature.icon} /> : null}
                <div
                  className={cn(
                    'flex-auto',
                    config.iconsOnTop && 'text-center',
                  )}
                >
                  <dt className="text-lg/7 font-semibold text-foreground">
                    <Trans message={feature.title} />
                  </dt>
                  <dd className="mt-2 text-base/7 text-muted-foreground">
                    <Trans message={feature.description} />
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

function getColumnsClassName(maxColumns?: number | string): string {
  switch (`${maxColumns}`) {
    case '4':
      return 'lg:grid-cols-4';
    case '3':
      return 'lg:grid-cols-3';
    default:
      return 'lg:grid-cols-2'; // default to 2 columns
  }
}

/**
 * Linket's editorial three-step journey. Based on the free numbered-process
 * pattern, with optional images instead of icon-heavy feature cards.
 * Standard feature grids continue using the original renderer above.
 */
function CreatorJourney({config}: FeaturesGridProps) {
  return (
    <section
      aria-label={config.title}
      className={cn(
        'overflow-hidden py-16 sm:py-20 lg:py-24',
        config.mutedBg && 'bg-muted/40 dark:bg-card',
      )}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          {config.badge ? (
            <p className="text-sm font-semibold text-primary">
              <Trans message={config.badge} />
            </p>
          ) : null}
          {config.title ? (
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl">
              <Trans message={config.title} />
            </h2>
          ) : null}
          {config.description ? (
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              <Trans message={config.description} />
            </p>
          ) : null}
        </div>
        <ol className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 md:grid-cols-3 md:gap-5 lg:gap-6">
          {config.features?.map((feature, index) => (
            <li
              key={`${index}-${feature.title}`}
              className="relative flex min-w-0 flex-col overflow-visible rounded-2xl border border-border/70 bg-background shadow-sm"
            >
              <div className="relative overflow-hidden rounded-t-[inherit] border-b border-border/60 bg-primary/5">
                {feature.image?.src ? (
                  <img
                    alt=""
                    src={feature.image.src}
                    width={feature.image.width}
                    height={feature.image.height}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/3] w-full object-contain p-3 sm:p-4"
                  />
                ) : (
                  <div aria-hidden="true" className="aspect-[4/3] w-full bg-linear-to-br from-primary/10 via-muted/40 to-background" />
                )}
              </div>
              <div className="flex items-start gap-3 p-5 sm:gap-4 sm:p-6">
                <span
                  aria-hidden="true"
                  className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold tabular-nums text-primary-foreground"
                >
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground">
                    <Trans message={feature.title} />
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    <Trans message={feature.description} />
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/**
 * An image-first product showcase for creators. Local, uploaded or licensed
 * images can be assigned individually in the existing landing-page editor.
 * The icon fallback preserves customized feature cards until media is chosen.
 */
function CreatorProductCatalog({config}: FeaturesGridProps) {
  return (
    <section
      aria-label={config.title}
      className={cn(
        'py-16 sm:py-20 lg:py-24',
        config.mutedBg && 'bg-muted/40 dark:bg-card',
      )}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          {config.badge ? (
            <p className="text-sm font-semibold text-primary">
              <Trans message={config.badge} />
            </p>
          ) : null}
          {config.title ? (
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance text-foreground sm:text-4xl lg:text-5xl">
              <Trans message={config.title} />
            </h2>
          ) : null}
          {config.description ? (
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              <Trans message={config.description} />
            </p>
          ) : null}
        </div>
        <ul className="mt-10 grid grid-cols-1 gap-4 sm:mt-12 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {config.features?.map((feature, index) => (
            <li
              key={`${index}-${feature.title}`}
              className="group min-w-0 rounded-2xl border border-border/70 bg-card p-3 shadow-sm"
            >
              <div className="flex aspect-[5/4] items-center justify-center overflow-hidden rounded-xl bg-muted/40">
                {feature.image?.src ? (
                  <img
                    alt=""
                    src={feature.image.src}
                    width={feature.image.width}
                    height={feature.image.height}
                    loading="lazy"
                    decoding="async"
                    className="size-full object-contain p-4"
                  />
                ) : feature.icon ? (
                  <div aria-hidden="true" className="flex size-16 items-center justify-center rounded-2xl bg-background shadow-xs">
                    <ConfigIconWithBg icon={feature.icon} />
                  </div>
                ) : (
                  <div aria-hidden="true" className="size-16 rounded-2xl border border-border/70 bg-background/60" />
                )}
              </div>
              <div className="px-2 pt-5 pb-4">
                <h3 className="text-base font-semibold tracking-tight text-foreground">
                  <Trans message={feature.title} />
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  <Trans message={feature.description} />
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

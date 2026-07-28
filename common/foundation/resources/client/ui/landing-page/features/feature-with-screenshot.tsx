import {
  ConfigIcon,
  ConfigIconWithBg,
} from '@common/ui/landing-page/config-icon';
import {LandingPageImageConfig} from '@common/ui/landing-page/landing-page-config';
import {Trans} from '@ui/i18n/trans';
import {IconTree} from '@ui/icons/create-svg-icon';
import {cn} from '@ui/utils/cn';
import clsx from 'clsx';

export type FeatureWithScreenshotConfig = {
  name: 'feature-with-screenshot';
  title: string;
  badge: string;
  description: string;
  image?: LandingPageImageConfig;
  imageSize?: 'xs' | 'sm' | 'lg' | 'md';
  alignLeft?: boolean;
  imagePanel?: boolean;
  inPanel?: boolean;
  forceDarkMode?: boolean;
  wrapIconsInBg?: boolean;
  features: {
    title: string;
    description: string;
    icon?: string | IconTree[];
  }[];
};

type Props = {
  config: FeatureWithScreenshotConfig;
};
export function FeatureWithScreenshot({config}: Props) {
  const isSmallPanel = config.inPanel && config.imageSize !== 'lg';
  const isLargePanel = config.inPanel && !isSmallPanel;

  const panelClassName =
    'overflow-hidden border border-border/80 bg-muted/40 dark:bg-card py-20 sm:rounded-3xl sm:py-24 lg:py-24 isolate';

  return (
    <div
      className={cn(
        'overflow-hidden py-24 sm:py-32',
        config.forceDarkMode && 'dark',
        !config.inPanel && 'bg',
      )}
    >
      <section
        className={cn(isLargePanel && panelClassName, isLargePanel && 'mx-2')}
      >
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div
            className={cn(
              'relative',
              isSmallPanel && panelClassName,
              isSmallPanel && 'px-6 sm:px-10 xl:px-24',
            )}
          >
            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 sm:gap-y-20 lg:mx-0 lg:max-w-none lg:grid-cols-2">
              <div
                className={cn(
                  config.alignLeft
                    ? 'lg:ml-auto lg:pt-4 lg:pl-4'
                    : 'lg:pt-4 lg:pr-8',
                )}
              >
                <div className="lg:max-w-lg">
                  {config.badge ? (
                    <h2 className="text-base/7 font-semibold text-primary">
                      <Trans message={config.badge} />
                    </h2>
                  ) : null}
                  {config.title ? (
                    <p className="mt-2 text-4xl font-semibold tracking-tight text-pretty text-foreground sm:text-5xl">
                      <Trans message={config.title} />
                    </p>
                  ) : null}
                  {config.description ? (
                    <p className="mt-6 text-lg/8 text-muted-foreground">
                      <Trans message={config.description} />
                    </p>
                  ) : null}
                  <div className="mt-10 max-w-xl space-y-8 text-base/7 text-muted-foreground lg:max-w-none">
                    {config.features?.map(feature => (
                      <div
                        key={feature.title}
                        className="flex items-start gap-x-4.5"
                      >
                        {feature.icon ? (
                          config.wrapIconsInBg ? (
                            <ConfigIconWithBg icon={feature.icon} />
                          ) : (
                            <ConfigIcon
                              icon={feature.icon}
                              className="mt-1 size-5 text-primary"
                            />
                          )
                        ) : null}
                        <div>
                          <div className="font-semibold text-foreground">
                            <Trans message={feature.title} />
                          </div>{' '}
                          <div>
                            <Trans message={feature.description} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {config.image ? (
                <div
                  className={cn(
                    config.alignLeft && '-order-1 flex items-start justify-end',
                  )}
                >
                  {config.imagePanel ? (
                    <ScreenshotPanel config={config} />
                  ) : (
                    <img
                      alt=""
                      src={config.image.src}
                      width={config.image.width}
                      height={config.image.height}
                      className={cn(
                        'max-w-none rounded-xl border shadow-xl md:-ml-4 lg:ml-0',
                        getImageWidth(config),
                      )}
                    />
                  )}
                </div>
              ) : null}
            </div>
            <Gradient />
          </div>
        </div>
      </section>
    </div>
  );
}

type ScreenshotPanelProps = {
  config: FeatureWithScreenshotConfig;
};
function ScreenshotPanel({config}: ScreenshotPanelProps) {
  if (!config.image) {
    return null;
  }
  return (
    <div className="sm:px-6 lg:px-0">
      <div
        className={clsx(
          'relative isolate overflow-hidden bg-primary px-6 pt-8 sm:mx-auto sm:max-w-2xl sm:rounded-3xl sm:pt-16 lg:mx-0 lg:max-w-none',
          config.alignLeft ? 'sm:pr-16 sm:pl-0' : 'sm:pr-0 sm:pl-16',
        )}
      >
        <div
          aria-hidden="true"
          className={clsx(
            'absolute -inset-y-px -left-3 -z-10 w-full origin-bottom-left bg-primary/25 opacity-20 ring-1 ring-white ring-inset',
            config.alignLeft ? 'skew-x-30' : 'skew-x-[-30deg]',
          )}
        />
        <div className="mx-auto max-w-2xl sm:mx-0 sm:max-w-none">
          <img
            alt="Product screenshot"
            src={config.image.src}
            width={config.image.width}
            height={config.image.height}
            className={clsx(
              '-mb-12 max-w-none bg-background ring-1 ring-white/10',
              getImageWidth(config),
              config.alignLeft ? 'rounded-tr-xl' : 'rounded-tl-xl',
            )}
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 ring-1 ring-black/10 ring-inset sm:rounded-3xl"
        />
      </div>
    </div>
  );
}

function Gradient() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-12 -z-10 -translate-y-1/2 transform-gpu opacity-60 blur-3xl lg:top-auto lg:-bottom-48 lg:translate-y-0 lg:transform-gpu dark:opacity-100"
    >
      <div
        style={{
          clipPath:
            'polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)',
        }}
        className="aspect-1155/678 w-288.75 bg-linear-to-tr from-primary/25 to-primary opacity-30"
      />
    </div>
  );
}

function getImageWidth(config: Props['config']) {
  if (config.imagePanel) {
    switch (config.imageSize) {
      case 'xs':
        return 'w-135';
      case 'sm':
        return 'w-160';
      case 'lg':
        return 'w-228';
      default:
        return 'w-192';
    }
  }

  switch (config.imageSize) {
    case 'xs':
      return 'w-135 sm:w-160';
    case 'sm':
      return 'w-160 sm:w-192';
    case 'lg':
      return 'w-228 sm:w-264';
    default:
      return 'w-192 sm:w-228 ';
  }
}

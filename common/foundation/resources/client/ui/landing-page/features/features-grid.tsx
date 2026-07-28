import {ConfigIconWithBg} from '@common/ui/landing-page/config-icon';
import {Trans} from '@ui/i18n/trans';
import {IconTree} from '@ui/icons/create-svg-icon';
import {cn} from '@ui/utils/cn';

export type FeaturesGridConfig = {
  name: 'features-grid';
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
  }[];
};

type FeaturesGridProps = {
  config: FeaturesGridConfig;
};
export default function FeaturesGrid({config}: FeaturesGridProps) {
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

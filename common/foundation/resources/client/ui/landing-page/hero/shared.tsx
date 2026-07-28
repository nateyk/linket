import {BaseHeroConfig} from '@common/ui/landing-page/hero/base-hero-config';
import {LandingPageButtonConfig} from '@common/ui/landing-page/landing-page-config';
import {LinkButton} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import {createSvgIconFromTree} from '@ui/icons/create-svg-icon';
import {cn} from '@ui/utils/cn';
import {ReactNode} from 'react';

type HeadingProps = {
  children: ReactNode;
  className?: string;
};
export function Heading({children, className}: HeadingProps) {
  return (
    <h1
      className={cn(
        className,
        'text-5xl font-semibold tracking-tight text-pretty text-foreground sm:text-7xl',
      )}
    >
      {children}
    </h1>
  );
}

type DescriptionProps = {
  children: ReactNode;
  className?: string;
};
export function Description({children, className}: DescriptionProps) {
  return (
    <p
      className={cn(
        className,
        'text-lg font-medium text-pretty text-muted-foreground sm:text-xl/8',
      )}
    >
      {children}
    </p>
  );
}

type ButtonsProps = {
  buttons: LandingPageButtonConfig[];
  className?: string;
};
export function Buttons({buttons, className}: ButtonsProps) {
  if (!buttons?.length) return null;
  return (
    <div className={cn('flex items-center', className)}>
      {buttons.map((button, index) => (
        <CtaButton key={index} config={button} />
      ))}
    </div>
  );
}

type CtaButtonProps = {
  config: LandingPageButtonConfig;
};
function CtaButton({config}: CtaButtonProps) {
  if (!config?.label) return null;
  const Icon = config.icon ? createSvgIconFromTree(config.icon) : undefined;
  return (
    <LinkButton
      to={config.action}
      variant={config.variant}
      color={config.color ?? undefined}
      className="min-h-10"
    >
      <Trans message={config.label} />
      {Icon ? <Icon /> : undefined}
    </LinkButton>
  );
}

export type BgColorsProps = {
  config: BaseHeroConfig;
};
export function BgColors({config}: BgColorsProps) {
  if (!config.bgColors) return null;

  const color1 = config.bgColors.color1;
  const color2 = config.bgColors.color2;
  const opacity = config.bgColors.opacity;
  let background = undefined;

  if (color1 && color2) {
    background = `linear-gradient(45deg, ${color1} 0%, ${color2} 100%)`;
  } else if (color1) {
    background = color1;
  } else if (color2) {
    background = color2;
  }

  return (
    <div className="absolute inset-0 -z-10" style={{opacity, background}} />
  );
}

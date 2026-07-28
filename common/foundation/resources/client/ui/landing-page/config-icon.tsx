import {LandingPageContext} from '@common/ui/landing-page/landing-page-context';
import {createSvgIconFromTree, IconTree} from '@ui/icons/create-svg-icon';
import {cloneElement, use} from 'react';

type Props = {
  icon: string | IconTree[];
  className?: string;
};
export function ConfigIcon({icon, className}: Props) {
  const {defaultIcons} = use(LandingPageContext);
  if (!icon) return null;

  if (typeof icon === 'string') {
    const iconEl = defaultIcons[icon];
    return iconEl ? cloneElement<any>(iconEl, {className}) : null;
  }

  const Icon = icon ? createSvgIconFromTree(icon) : null;
  return Icon ? <Icon className={className} /> : null;
}

type ConfigIconWithBgProps = {
  icon: string | IconTree[];
};
export function ConfigIconWithBg({icon}: ConfigIconWithBgProps) {
  return (
    <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary">
      <ConfigIcon icon={icon} className="size-6 text-primary-foreground" />
    </div>
  );
}

import {getCurrentThemeValue} from '@ui/themes/utils/get-current-theme-value';
import {cn} from '@ui/utils/cn';
import Color from 'colorjs.io';
import {CSSProperties, ReactNode, useMemo} from 'react';

interface Props {
  isActive: boolean;
  icon: ReactNode;
  title: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
}
export function TypeButton({isActive, icon, title, onClick, style}: Props) {
  const foregroundColor = useMemo(() => {
    // default to white text for images, as there's no easy way to get luminocity from image
    if (style?.backgroundImage && style.backgroundImage.includes('url(')) {
      return 'text-white';
    }

    const bgColor =
      style?.backgroundColor ?? getCurrentThemeValue('--be-background');
    return !bgColor || new Color(bgColor).luminance > 0.5
      ? 'text-muted-foreground'
      : 'text-white';
  }, [style?.backgroundColor, style?.backgroundImage]);

  return (
    <button
      className="group flex flex-col items-center gap-2 outline-hidden"
      onClick={onClick}
      data-active={isActive}
    >
      <span
        style={style}
        className={cn(
          'flex size-18 items-center justify-center rounded-card-xs border outline-offset-3 outline-primary group-focus-visible:outline-2 group-data-active:outline-2 md:size-23 [&_svg]:size-8',
          foregroundColor,
        )}
      >
        {icon}
      </span>
      <div className="text-xs">{title}</div>
    </button>
  );
}

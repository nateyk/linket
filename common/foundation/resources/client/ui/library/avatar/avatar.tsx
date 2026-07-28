import { AvatarInitialsFallback } from '@ui/avatar/avatar-initials-fallback';
import { AvatarPlaceholderIcon } from '@ui/avatar/avatar-placeholder-icon';
import { Tooltip } from '@ui/tooltip/tooltip';
import clsx from 'clsx';
import { ComponentProps, ComponentPropsWithoutRef, forwardRef } from 'react';
import { Link } from 'react-router';

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | string;

export interface AvatarProps extends ComponentPropsWithoutRef<any> {
  className?: string;
  src?: string;
  label?: string;
  labelForBackground?: string;
  circle?: boolean;
  size?: Size;
  link?: string;
  fallback?: 'initials' | 'generic';
  fallbackColor?: string;
  lazy?: boolean;
}
export const Avatar = forwardRef<HTMLImageElement, AvatarProps>(function (
  {
    className,
    circle = true,
    size = 'md',
    src,
    link,
    label,
    labelForBackground,
    fallback = 'initials',
    fallbackColor,
    lazy = true,
    ...domProps
  },
  ref,
) {
  let renderedAvatar = src ? (
    <img
      ref={ref}
      src={src}
      alt={label}
      loading={lazy ? 'lazy' : undefined}
      className="block h-full w-full object-cover"
    />
  ) : fallback === 'initials' && label ? (
    <AvatarInitialsFallback
      size={size}
      label={label}
      labelForBackground={labelForBackground}
      color={fallbackColor}
    />
  ) : (
    <div className="h-full w-full bg-muted dark:bg-secondary">
      <AvatarPlaceholderIcon
        viewBox="0 0 48 48"
        className="h-full w-full text-muted-foreground"
      />
    </div>
  );

  if (label) {
    renderedAvatar = <Tooltip label={label}>{renderedAvatar}</Tooltip>;
  }

  const wrapperProps: ComponentProps<any> = {
    ...domProps,
    className: clsx(
      className,
      'relative block overflow-hidden select-none flex-shrink-0',
      getSizeClassName(size),
      circle ? 'rounded-full' : 'rounded-sm',
    ),
  };

  return link ? (
    <Link {...wrapperProps} to={link}>
      {renderedAvatar}
    </Link>
  ) : (
    <div {...wrapperProps}>{renderedAvatar}</div>
  );
});

function getSizeClassName(size: Size) {
  switch (size) {
    case 'xs':
      return 'w-4.5 h-4.5';
    case 'sm':
      return 'w-6 h-6';
    case 'md':
      return 'w-8 h-8';
    case 'lg':
      return 'w-10 h-10';
    case 'xl':
      return 'w-15 h-15';
    // allow overriding with custom classNames
    default:
      return size;
  }
}

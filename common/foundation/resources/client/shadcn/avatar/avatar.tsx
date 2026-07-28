import {Avatar as AvatarPrimitive} from '@base-ui/react/avatar';
import {cn} from '@ui/utils/cn';
import * as React from 'react';

function AvatarRoot({
  className,
  size = 'default',
  ...props
}: AvatarPrimitive.Root.Props & {
  size?: 'default' | 'xs' | 'sm' | 'lg';
}) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      data-size={size}
      className={cn(
        'group/avatar relative flex size-8 shrink-0 rounded-full select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken data-[size=lg]:size-10 data-[size=sm]:size-6 data-[size=xs]:size-4.5 dark:after:mix-blend-lighten',
        className,
      )}
      {...props}
    />
  );
}

function AvatarImage({
  className,
  src,
  ...props
}: Omit<AvatarPrimitive.Image.Props, 'src'> & {
  src?: string | null;
}) {
  return (
    <AvatarPrimitive.Image
      src={src ?? undefined}
      data-slot="avatar-image"
      className={cn(
        'aspect-square size-full rounded-full object-cover',
        className,
      )}
      {...props}
    />
  );
}

function AvatarFallback({className, ...props}: AvatarPrimitive.Fallback.Props) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center rounded-full bg-secondary text-sm font-medium text-muted-foreground group-data-[size=sm]/avatar:text-xs group-data-[size=xs]/avatar:text-[10px]',
        className,
      )}
      {...props}
    />
  );
}

function AvatarColorFallback({
  children,
  className,
  style,
  ...props
}: Omit<AvatarPrimitive.Fallback.Props, 'children'> & {
  children?: string | null;
}) {
  const trimmedChildren = children?.trim() ?? '';
  const letter = trimmedChildren.slice(0, 1).toUpperCase() || '?';
  const hue = (letter.charCodeAt(0) * 29) % 360;

  return (
    <AvatarFallback
      className={cn('text-primary-foreground', className)}
      style={{
        backgroundColor: `oklch(62% 0.16 ${hue})`,
        ...style,
      }}
      {...props}
    >
      {letter}
    </AvatarFallback>
  );
}

function AvatarBadge({className, ...props}: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="avatar-badge"
      className={cn(
        'ring-bg-background absolute inset-e-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-positive text-primary-foreground bg-blend-color ring-2 select-none',
        'group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden',
        'group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2',
        'group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2',
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroup({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        'group/avatar-group *:data-[slot=avatar]:ring-bg-background flex -space-x-2 *:data-[slot=avatar]:ring-2',
        className,
      )}
      {...props}
    />
  );
}

function AvatarGroupCount({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        'ring-bg-background relative flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm text-muted-foreground ring-2 group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3',
        className,
      )}
      {...props}
    />
  );
}

function initials(fallback: string | undefined | null) {
  return fallback
    ?.split(' ')
    .map(part => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export const Avatar = Object.assign(AvatarRoot, {
  Root: AvatarRoot,
  Image: AvatarImage,
  Fallback: AvatarFallback,
  ColorFallback: AvatarColorFallback,
  Badge: AvatarBadge,
  Group: AvatarGroup,
  GroupCount: AvatarGroupCount,
  initials,
});

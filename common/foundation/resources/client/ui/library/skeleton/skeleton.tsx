import {cn} from '@ui/utils/cn';

interface SkeletonProps {
  variant?: 'avatar' | 'text' | 'rect' | 'icon';
  animation?: 'pulsate' | 'wave' | null; // disable animation completely with null
  className?: string;
  style?: React.CSSProperties;
}
export function Skeleton({
  variant = 'text',
  animation = 'wave',
  className,
  style,
}: SkeletonProps) {
  return (
    <span
      style={style}
      className={cn(
        'skeleton relative block overflow-hidden rounded-sm bg-muted bg-no-repeat will-change-transform',
        skeletonSize(variant),
        variant === 'text' && 'origin-[0_55%] scale-y-[0.6]',
        variant === 'avatar' && 'shrink-0',
        variant === 'icon' && 'mx-2 shrink-0',
        animation === 'wave' && 'skeleton-wave',
        animation === 'pulsate' && 'skeleton-pulsate',
        className,
      )}
      aria-busy
      aria-live="polite"
    />
  );
}

function skeletonSize(variant: SkeletonProps['variant']): string | undefined {
  switch (variant) {
    case 'avatar':
      return 'size-10';
    case 'icon':
      return 'size-6';
    case 'rect':
      return 'size-full';
    default:
      return 'w-full';
  }
}

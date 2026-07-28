import {ReactNode} from 'react';
import clsx from 'clsx';

export interface BadgeProps {
  children?: ReactNode;
  className?: string;
  withBorder?: boolean;
  top?: string;
  right?: string;
  color?: string;
}
export function Badge({
  children,
  className,
  withBorder = true,
  top = 'top-0.5',
  right = 'right-1',
  color = 'bg-warning text-white',
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'absolute flex items-center justify-center whitespace-nowrap rounded-full text-[11px] font-bold shadow-sm',
        withBorder && 'border-2 border-white',
        color,
        children ? 'w-max p-1 leading-[0.6]' : 'h-3 w-3',
        className,
        top,
        right,
      )}
    >
      {children}
    </span>
  );
}

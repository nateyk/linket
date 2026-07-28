import clsx from 'clsx';
import React from 'react';

type AdornmentProps = {
  children: React.ReactNode;
  direction: 'start' | 'end';
  position?: string;
  className?: string;
};
export function Adornment({
  children,
  direction,
  className,
  position = direction === 'start' ? 'left-1' : 'right-0',
}: AdornmentProps) {
  if (!children) return null;
  return (
    <div
      className={clsx(
        'absolute top-0 z-10 flex h-full min-w-10.5 items-center justify-center text-muted-foreground',
        position,
        className,
      )}
    >
      {children}
    </div>
  );
}

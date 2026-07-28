import {cn} from '@ui/utils/cn';
import {ComponentProps} from 'react';

export function IconGridButton({
  className,
  children,
  ...props
}: ComponentProps<'button'>) {
  return (
    <button
      className={cn(
        'flex size-14 min-w-0 flex-col items-center justify-center overflow-hidden rounded-md bg-secondary/50 transition-colors hover:bg-secondary',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

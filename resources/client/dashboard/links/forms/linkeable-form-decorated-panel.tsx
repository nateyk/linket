import {FadedDotsBackground} from '@ui/background/faded-dots-background';
import {cn} from '@ui/utils/cn';
import {ReactNode} from 'react';

type Props = {
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  floatingActions?: ReactNode;
  variant?: 'outline' | 'default';
  disabled?: boolean;
};
export function LinkeableFormDecoratedPanel({
  title,
  children,
  footer,
  className,
  floatingActions,
  variant = 'default',
  disabled = false,
}: Props) {
  return (
    <div
      className={cn(
        'flex w-full shrink-0 flex-col gap-5 overflow-hidden',
        variant === 'outline' && 'rounded-card border border-border/80 p-4',
        className,
      )}
    >
      <section className="flex flex-col gap-2">
        <div className="flex h-5 items-center justify-between text-sm font-medium">
          {title}
        </div>
        <div
          className={cn(
            'relative isolate flex items-center justify-center overflow-hidden rounded-card border bg-muted/50 py-3',
            disabled && 'pointer-events-none opacity-50',
          )}
        >
          {floatingActions ? (
            <div className="absolute top-3 right-3">{floatingActions}</div>
          ) : null}
          <FadedDotsBackground />
          {children}
        </div>
      </section>
      {footer}
    </div>
  );
}

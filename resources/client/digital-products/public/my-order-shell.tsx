import {cn} from '@ui/utils/cn';
import {ReactNode} from 'react';

export function MyOrderShell({
  children,
  wide = false,
}: {
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="min-h-screen bg-muted/30 px-4 py-8 sm:px-6 sm:py-10">
      <main
        className={cn(
          'mx-auto flex w-full flex-col gap-6',
          wide ? 'max-w-5xl' : 'max-w-2xl',
        )}
      >
        {children}
      </main>
    </div>
  );
}

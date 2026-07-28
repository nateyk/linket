import clsx from 'clsx';

export const dialogBaseStyles = {
  backdrop: clsx(
    'fixed inset-0 isolate z-50 bg-black/30 duration-100 supports-backdrop-filter:backdrop-blur-sm data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0',
  ),
  viewport: clsx(
    'fixed inset-0 z-50 mx-auto flex items-center justify-center overflow-hidden p-6 [@media(min-height:600px)]:py-12',
  ),
  popup: clsx(
    'relative min-h-0 flex-1 rounded-card bg-popover p-6 text-popover-foreground shadow-xl ring-1 ring-foreground/5 duration-100 outline-none dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95',
  ),
};

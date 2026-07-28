import clsx from 'clsx';

export const dropdownBaseStyles = {
  item: clsx([
    "group/dropdown-menu-item flex w-full cursor-default items-center gap-2.5 rounded-card-sm px-3 py-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    'data-[variant=destructive]:text-destructive data-[variant=destructive]:data-highlighted:bg-destructive/10 data-[variant=destructive]:data-highlighted:text-destructive data-[variant=destructive]:*:[svg]:text-destructive',
  ]),
  itemIndicatorWrapper: clsx(
    'pointer-events-none ml-auto flex min-w-4 items-center justify-center',
  ),
  groupLabel: clsx(
    'px-3 py-2.5 text-xs text-muted-foreground data-inset:ps-9.5',
  ),
  separator: clsx('pointer-events-none mx-3 my-1.5 h-px bg-border/50'),
  popup: clsx([
    'relative isolate z-50 max-h-[min(23rem,var(--available-height))] w-(--anchor-width) max-w-(--available-width) min-w-36 origin-(--transform-origin) overflow-hidden rounded-card bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/5 duration-100 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-start-2 data-[side=inline-start]:slide-in-from-end-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 dark:ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95',
    'flex flex-col data-empty:ring-0 *:data-[slot=input-group]:z-10 *:data-[slot=input-group]:m-3 *:data-[slot=input-group]:mb-1 *:data-[slot=input-group]:bg-popover',
  ]),
  scrollArea: clsx('flex min-h-0 flex-1 flex-col'),
  list: clsx(
    'compact-scrollbar flex-1 scroll-py-1.5 overflow-y-auto overscroll-contain p-1.5 outline-none data-empty:p-0',
  ),
  customScrollbar: clsx('mx-1.5 my-3'),
  empty: clsx(
    'flex w-full justify-center py-2 text-center text-sm text-muted-foreground empty:hidden',
  ),
};

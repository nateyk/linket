import {Tabs as TabsPrimitive} from '@base-ui/react/tabs';
import {cva, type VariantProps} from 'class-variance-authority';

import {cn} from '@ui/utils/cn';
import {Link, LinkProps} from 'react-router';

/**
 * A component for toggling between related panels on the same page.
 */
function TabsRoot({
  className,
  orientation = 'horizontal',
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        'group/tabs flex gap-2 data-horizontal:flex-col',
        className,
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  'group/tabs-list relative isolate inline-flex w-fit items-center justify-center rounded-full p-1 text-muted-foreground group-data-horizontal/tabs:h-9 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col group-data-vertical/tabs:rounded-card-sm data-[variant=line]:rounded-none',
  {
    variants: {
      variant: {
        default: 'bg-muted',
        line: 'gap-1 bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function TabsList({
  className,
  children,
  variant = 'default',
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({variant}), className)}
      {...props}
    >
      {children}
      <TabsPrimitive.Indicator className="absolute bottom-(--active-tab-bottom) left-0 z-[-1] h-(--active-tab-height) w-(--active-tab-width) translate-x-(--active-tab-left) rounded-card-sm bg-background transition-all duration-200 ease-in-out group-data-[variant=default]/tabs-list:top-(--active-tab-top) group-data-[variant=line]/tabs-list:bottom-[calc(var(--active-tab-bottom)-6px)] group-data-[variant=line]/tabs-list:h-0.5 group-data-[variant=line]/tabs-list:bg-primary dark:bg-input/30" />
    </TabsPrimitive.List>
  );
}

function Tab({className, ...props}: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-2 rounded-full border border-transparent! px-3 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start group-data-vertical/tabs:rounded-card-sm group-data-vertical/tabs:px-3 group-data-vertical/tabs:py-1.5 hover:text-foreground disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:text-foreground group-data-[variant=line]/tabs-list:data-active:text-primary [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function LinkTab({
  className,
  ref,
  value,
  ...props
}: TabsPrimitive.Tab.Props & LinkProps) {
  return (
    <Tab
      value={value}
      ref={ref}
      nativeButton={false}
      className={className}
      render={<Link {...props} />}
    />
  );
}

function TabsPanel({className, ...props}: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn('flex-1 text-sm outline-none', className)}
      {...props}
    />
  );
}

export const Tabs = Object.assign(TabsRoot, {
  Root: TabsRoot,
  List: TabsList,
  Tab: Tab,
  LinkTab: LinkTab,
  Panel: TabsPanel,
});

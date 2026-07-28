import {Drawer as DrawerPrimitive} from '@base-ui/react/drawer';

import {cn} from '@ui/utils/cn';
import {cva} from 'class-variance-authority';
import {ComponentProps, createContext, use, useMemo} from 'react';

type DrawerContextValue = {
  position: 'left' | 'right' | 'top' | 'bottom';
};
const DrawerContext = createContext<DrawerContextValue>(null!);

/**
 * A panel that slides in from the edge of the screen.
 */
function DrawerRoot({
  position = 'right',
  ...props
}: Omit<ComponentProps<typeof DrawerPrimitive.Root>, 'swipeDirection'> & {
  position: DrawerContextValue['position'];
}) {
  const ctxValue = useMemo(() => ({position}), [position]);
  let swipeDirection: DrawerPrimitive.Root.Props['swipeDirection'] =
    position === 'top' ? 'up' : position === 'bottom' ? 'down' : position;
  return (
    <DrawerContext.Provider value={ctxValue}>
      <DrawerPrimitive.Root
        data-slot="drawer"
        swipeDirection={swipeDirection}
        {...props}
      />
    </DrawerContext.Provider>
  );
}

function DrawerTrigger({
  ...props
}: ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />;
}

function DrawerClose({...props}: ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

function DrawerBackdrop({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Backdrop>) {
  return (
    <DrawerPrimitive.Backdrop
      data-slot="drawer-overlay"
      className={cn(
        'fixed inset-0 z-50 min-h-dvh bg-black opacity-[calc(var(--backdrop-opacity)*(1-var(--drawer-swipe-progress)))] transition-opacity duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] [--backdrop-opacity:0.2] data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:opacity-0 data-swiping:duration-0 supports-[-webkit-touch-callout:none]:absolute dark:[--backdrop-opacity:0.7]',
        className,
      )}
      {...props}
    />
  );
}

function DrawerPortal({
  ...props
}: ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />;
}

const drawerPopupVariants = cva(
  'group/drawer-popup touch-auto bg-popover p-6 transition-transform duration-450 ease-[cubic-bezier(0.32,0.72,0,1)] after:absolute after:inset-0 after:bg-inherit data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-swiping:select-none',
  {
    variants: {
      position: {
        top: 'mb-12 max-h-[80vh] w-full [transform:translateY(var(--drawer-swipe-movement-y))] rounded-b-card after:top-auto after:bottom-full after:h-[200%] data-ending-style:transform-[translateY(-100%)] data-starting-style:transform-[translateY(-100%)]',
        right:
          'ml-12 h-full w-3/4 transform-[translateX(var(--drawer-swipe-movement-x))] rounded-l-card after:right-auto after:left-full after:w-[200%] data-ending-style:transform-[translateX(100%)] data-starting-style:transform-[translateX(100%)] sm:max-w-sm',
        left: 'mr-12 h-full w-3/4 transform-[translateX(var(--drawer-swipe-movement-x))] rounded-r-card after:right-full after:left-auto after:w-[200%] data-ending-style:transform-[translateX(-100%)] data-starting-style:transform-[translateX(-100%)] sm:max-w-sm',
        bottom:
          'mt-12 max-h-[80vh] w-full [transform:translateY(var(--drawer-swipe-movement-y))] rounded-t-card pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] after:top-full after:bottom-auto after:h-[200%] data-ending-style:transform-[translateY(100%)] data-starting-style:transform-[translateY(100%)]',
      },
    },
  },
);
const drawerViewportVariants = cva('fixed inset-0 z-50 flex', {
  variants: {
    position: {
      top: 'items-start',
      right: 'items-stretch justify-end',
      left: 'items-stretch justify-start',
      bottom: 'items-end',
    },
  },
});

function DrawerContent({
  className,
  popupClassName,
  children,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Content> & {
  popupClassName?: string;
}) {
  const {position} = use(DrawerContext);
  return (
    <DrawerPrimitive.Viewport className={drawerViewportVariants({position})}>
      <DrawerPrimitive.Popup
        data-slot="drawer-popup"
        data-position={position}
        className={cn(drawerPopupVariants({position}), popupClassName)}
      >
        {position === 'bottom' && (
          <div className="mx-auto mb-3.5 h-1.5 w-[100px] shrink-0 rounded-full bg-muted" />
        )}
        <DrawerPrimitive.Content
          data-slot="drawer-content"
          className={cn(
            'group/drawer-content flex h-full w-full flex-col gap-6 text-sm',
            className,
          )}
          {...props}
        >
          {children}
        </DrawerPrimitive.Content>
      </DrawerPrimitive.Popup>
    </DrawerPrimitive.Viewport>
  );
}

function DrawerHeader({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        'flex flex-col gap-0.5 group-data-[position=bottom]/drawer-popup:text-center group-data-[position=top]/drawer-popup:text-center md:gap-1.5 md:text-start',
        className,
      )}
      {...props}
    />
  );
}

function DrawerBody({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-body"
      className={cn(
        'compact-scrollbar -mx-6 min-h-0 flex-1 overflow-y-auto overscroll-contain px-6',
        className,
      )}
      {...props}
    />
  );
}

function DrawerFooter({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn('mt-auto flex flex-col gap-2', className)}
      {...props}
    />
  );
}

function DrawerTitle({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn('text-base font-medium text-foreground', className)}
      {...props}
    />
  );
}

function DrawerDescription({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export const Drawer = Object.assign(DrawerRoot, {
  Root: DrawerRoot,
  Trigger: DrawerTrigger,
  Portal: DrawerPortal,
  Close: DrawerClose,
  Backdrop: DrawerBackdrop,
  Content: DrawerContent,
  Header: DrawerHeader,
  Body: DrawerBody,
  Footer: DrawerFooter,
  Title: DrawerTitle,
  Description: DrawerDescription,
});

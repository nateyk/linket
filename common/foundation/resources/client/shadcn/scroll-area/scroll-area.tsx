import {ScrollArea as ScrollAreaPrimitive} from '@base-ui/react/scroll-area';

import {cn} from '@ui/utils/cn';
import {cva, VariantProps} from 'class-variance-authority';

function ScrollArea({className, ...props}: ScrollAreaPrimitive.Root.Props) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn('relative', className)}
      {...props}
    />
  );
}

function ScrollAreaViewport({
  className,
  children,
  ...props
}: ScrollAreaPrimitive.Viewport.Props) {
  return (
    <ScrollAreaPrimitive.Viewport
      data-slot="scroll-area-viewport"
      className={cn(
        'no-scrollbar! size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1',
        className,
      )}
      {...props}
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
  );
}

function ScrollAreaCorner({
  className,
  ...props
}: ScrollAreaPrimitive.Corner.Props) {
  return (
    <ScrollAreaPrimitive.Corner data-slot="scroll-area-corner" {...props} />
  );
}

const scrollbarVariants = cva(
  'flex touch-none rounded-full transition-[background-color,opacity] select-none',
  {
    variants: {
      orientation: {
        vertical: 'w-1 flex-row',
        horizontal: 'h-1 flex-col',
      },
      onlyShowOnHover: {
        false: null,
        true: 'pointer-events-none opacity-0 data-[hovering]:pointer-events-auto data-[hovering]:opacity-100 data-[hovering]:delay-0 data-[scrolling]:pointer-events-auto data-[scrolling]:opacity-100 data-[scrolling]:duration-0',
      },
      showTrack: {
        false: null,
        true: 'bg-foreground/6',
      },
    },
    defaultVariants: {
      orientation: 'vertical',
    },
  },
);

function ScrollAreaScrollBar({
  className,
  orientation = 'vertical',
  showTrack = false,
  onlyShowOnHover = false,
  ...props
}: ScrollAreaPrimitive.Scrollbar.Props &
  VariantProps<typeof scrollbarVariants>) {
  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      data-orientation={orientation}
      orientation={orientation}
      className={cn(
        scrollbarVariants({orientation, showTrack, onlyShowOnHover}),
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-full bg-foreground/20"
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

export {ScrollArea, ScrollAreaCorner, ScrollAreaScrollBar, ScrollAreaViewport};

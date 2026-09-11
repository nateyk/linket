'use client';

import {Dialog as DialogPrimitive} from '@base-ui/react/dialog';
import {dialogBaseStyles} from '@shadcn/dialog/dialog-base-styles';
import {cn} from '@ui/utils/cn';
import {cva, type VariantProps} from 'class-variance-authority';

/**
 * A side panel that opens on top of the entire page.
 */
function Sheet({...props}: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({...props}: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

const sheetContentVariants = cva(
  'fixed z-50 flex flex-col gap-0 bg-card text-card-foreground shadow-xl outline-none will-change-transform data-closed:animate-out data-closed:duration-200 data-closed:fade-out-0 data-open:animate-in data-open:fade-in-0 duration-300',
  {
    variants: {
      side: {
        right:
          'inset-y-0 right-0 h-full w-full border-l data-closed:slide-out-to-right data-open:slide-in-from-right',
        left:
          'inset-y-0 left-0 h-full w-full border-r data-closed:slide-out-to-left data-open:slide-in-from-left',
        top: 'inset-x-0 top-0 h-auto border-b data-closed:slide-out-to-top data-open:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 h-auto border-t data-closed:slide-out-to-bottom data-open:slide-in-from-bottom',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  },
);

function SheetContent({
  className,
  side = 'right',
  children,
  ...props
}: DialogPrimitive.Popup.Props & VariantProps<typeof sheetContentVariants>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Backdrop
        data-slot="sheet-backdrop"
        className={cn(
          dialogBaseStyles.backdrop,
          'duration-300 data-closed:duration-200',
        )}
      />
      <DialogPrimitive.Popup
        data-slot="sheet-content"
        className={cn(sheetContentVariants({side}), className)}
        {...props}
      >
        {children}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Portal>
  );
}

function SheetHeader({className, ...props}: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="sheet-header"
      className={cn('flex flex-col gap-1.5', className)}
      {...props}
    />
  );
}

function SheetTitle({className, ...props}: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="sheet-title"
      className={cn('text-base font-medium', className)}
      {...props}
    />
  );
}

export {Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger};

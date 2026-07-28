'use client';

import {Dialog as DialogPrimitive} from '@base-ui/react/dialog';
import * as React from 'react';

import {Button} from '@shadcn/button/button';
import {dialogBaseStyles} from '@shadcn/dialog/dialog-base-styles';
import {cn} from '@ui/utils/cn';
import {XIcon} from 'lucide-react';
import {ComponentProps, ReactElement} from 'react';

/**
 * A popup that opens on top of the entire page.
 */
function DialogRoot({...props}: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({...props}: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({...props}: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogBackdrop({className, ...props}: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-backdrop"
      className={cn(dialogBaseStyles.backdrop, className)}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPrimitive.Viewport className={dialogBaseStyles.viewport}>
      <DialogPrimitive.Popup
        data-slot="dialog-content"
        className={cn(
          dialogBaseStyles.popup,
          'mt-[calc(3rem*var(--nested-dialogs))] flex max-h-full w-full max-w-full scale-[calc(1-0.1*var(--nested-dialogs))] flex-col gap-5.5 text-sm data-nested-dialog-open:after:absolute data-nested-dialog-open:after:inset-0 data-nested-dialog-open:after:rounded-[inherit] data-nested-dialog-open:after:bg-black/15 sm:max-w-md',
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            render={
              <Button
                variant="ghost"
                className="absolute inset-e-4 top-4"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPrimitive.Viewport>
  );
}

function DialogHeader({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1.5', className)}
      {...props}
    />
  );
}

function DialogBody({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-body"
      className={cn(
        'compact-scrollbar -mx-4 min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-0.5',
        className,
      )}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  children,
  variant = 'default',
  ...props
}: React.ComponentProps<'div'> & {variant?: 'default' | 'muted'}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        '-mx-6 -mb-6 flex flex-col-reverse gap-2 rounded-b-card px-6 pb-6 sm:flex-row sm:justify-end',
        variant === 'muted' && 'border-t bg-muted/50 pt-6',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function DialogCloseButton({render, ...props}: ComponentProps<typeof Button>) {
  return (
    <DialogPrimitive.Close
      {...props}
      render={render ?? <Button variant="outline" />}
    />
  );
}

function DialogTitle({className, ...props}: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn(
        "flex items-center gap-2 text-base leading-none font-medium [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        'text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

const Dialog = Object.assign(DialogRoot, {
  Root: DialogRoot,
  Trigger: DialogTrigger,
  Portal: DialogPortal,
  Backdrop: DialogBackdrop,
  Content: DialogContent,
  Header: DialogHeader,
  Body: DialogBody,
  Footer: DialogFooter,
  CloseButton: DialogCloseButton,
  Title: DialogTitle,
  Description: DialogDescription,
  createHandle: DialogPrimitive.createHandle,
});

declare namespace Dialog {
  export type TriggerElement = ReactElement<
    ComponentProps<typeof DialogTrigger>
  >;
}

export {Dialog};

import {AlertDialog as AlertDialogPrimitive} from '@base-ui/react/alert-dialog';

import {Button} from '@shadcn/button/button';
import {dialogBaseStyles} from '@shadcn/dialog/dialog-base-styles';
import {cn} from '@ui/utils/cn';
import {ComponentProps, ReactElement} from 'react';

function Root<Payload>({...props}: AlertDialogPrimitive.Root.Props<Payload>) {
  return (
    <AlertDialogPrimitive.Root<Payload> data-slot="alert-dialog" {...props} />
  );
}

function Trigger({...props}: AlertDialogPrimitive.Trigger.Props) {
  return (
    <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
  );
}

function Portal({...props}: AlertDialogPrimitive.Portal.Props) {
  return (
    <AlertDialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />
  );
}

function Backdrop({className, ...props}: AlertDialogPrimitive.Backdrop.Props) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-backdrop"
      className={cn(dialogBaseStyles.backdrop, className)}
      {...props}
    />
  );
}

function Content({
  className,
  size = 'default',
  ...props
}: AlertDialogPrimitive.Popup.Props & {
  size?: 'default' | 'sm';
}) {
  return (
    <AlertDialogPrimitive.Viewport className={dialogBaseStyles.viewport}>
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          dialogBaseStyles.popup,
          'group/alert-dialog-content grid gap-6 data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-md',
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Viewport>
  );
}

function Header({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        'grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-6 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-start sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]',
        className,
      )}
      {...props}
    />
  );
}

function Footer({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        'flex flex-col-reverse gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end',
        className,
      )}
      {...props}
    />
  );
}

function Media({className, ...props}: ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-dialog-media"
      className={cn(
        "mb-2 inline-flex size-10 items-center justify-center rounded-card bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-6",
        className,
      )}
      {...props}
    />
  );
}

function Title({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        'text-base font-medium sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2',
        className,
      )}
      {...props}
    />
  );
}

function Description({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn(
        'text-sm text-balance text-muted-foreground md:text-pretty *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground',
        className,
      )}
      {...props}
    />
  );
}

function Action({className, ...props}: ComponentProps<typeof Button>) {
  return (
    <Button
      data-slot="alert-dialog-action"
      className={cn(className)}
      {...props}
    />
  );
}

function Cancel({
  className,
  variant = 'outline',
  size = 'default',
  ...props
}: AlertDialogPrimitive.Close.Props &
  Pick<ComponentProps<typeof Button>, 'variant' | 'size'>) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  );
}

const AlertDialog = Object.assign(Root, {
  Root,
  Trigger,
  Portal,
  Backdrop,
  Content,
  Header,
  Footer,
  Media,
  Title,
  Description,
  Action,
  Cancel,
  createHandle: AlertDialogPrimitive.createHandle,
});

namespace AlertDialog {
  export type TriggerElement = ReactElement<
    ComponentProps<typeof AlertDialogPrimitive.Trigger>
  >;
}

export {AlertDialog};

import {
  ToastManagerAddOptions,
  Toast as ToastPrimitive,
} from '@base-ui/react/toast';
import {Button} from '@shadcn/button/button';
import {Spinner} from '@shadcn/spinner/spinner';
import {cn} from '@ui/utils/cn';
import {cva} from 'class-variance-authority';
import {
  CircleAlertIcon,
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react';
import {ReactNode} from 'react';

type ToastType = 'success' | 'info' | 'warning' | 'error' | 'loading';

type ToastOptions<Data extends object> = Omit<
  ToastManagerAddOptions<Data>,
  'title'
> & {
  position?:
    | 'top-center'
    | 'top-left'
    | 'top-right'
    | 'bottom-center'
    | 'bottom-left'
    | 'bottom-right';
};

type ToastPosition = NonNullable<ToastOptions<object>['position']>;
type ToastVerticalPosition = 'top' | 'bottom';
type ToastHorizontalPosition = 'left' | 'center' | 'right';

type ToastPositionVariantProps = {
  vertical: ToastVerticalPosition;
  horizontal: ToastHorizontalPosition;
};

const defaultPosition: ToastPosition = 'bottom-center';

const viewportVariants = cva(
  'fixed isolate z-100 flex w-sm max-w-[calc(100vw-2rem)] items-center',
  {
    variants: {
      position: {
        'top-left': 'top-4 right-auto left-4',
        'top-center': 'top-4 right-0 left-0 mx-auto',
        'top-right': 'top-4 right-4 left-auto',
        'bottom-left': 'right-auto bottom-4 left-4',
        'bottom-center': 'right-0 bottom-4 left-0 mx-auto',
        'bottom-right': 'right-4 bottom-4 left-auto',
      },
    },
    defaultVariants: {
      position: defaultPosition,
    },
  },
);

const toastVariants = cva(
  'absolute z-[calc(100-var(--toast-index))] h-(--height) w-full max-w-sm rounded-card bg-popover bg-clip-padding p-4 text-popover-foreground shadow-lg ring-1 ring-foreground/5 select-none [--gap:0.75rem] [--height:var(--toast-frontmost-height,var(--toast-height))] [--peek:0.75rem] [--scale:calc(max(0,1-(var(--toast-index)*0.1)))] [--shrink:calc(1-var(--scale))] [transition:transform_0.5s_cubic-bezier(0.22,1,0.36,1),opacity_0.5s,height_0.15s] data-ending-style:opacity-0 data-expanded:h-(--toast-height) data-limited:opacity-0 data-ending-style:data-[swipe-direction=left]:transform-[translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-expanded:data-ending-style:data-[swipe-direction=left]:transform-[translateX(calc(var(--toast-swipe-movement-x)-150%))_translateY(var(--offset-y))] data-ending-style:data-[swipe-direction=right]:transform-[translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))] data-expanded:data-ending-style:data-[swipe-direction=right]:transform-[translateX(calc(var(--toast-swipe-movement-x)+150%))_translateY(var(--offset-y))]',
  {
    variants: {
      vertical: {
        top: "top-0 bottom-auto origin-top transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+(var(--toast-index)*var(--peek))+(var(--shrink)*var(--height))))_scale(var(--scale))] [--offset-y:calc(var(--toast-offset-y)+calc(var(--toast-index)*var(--gap))+var(--toast-swipe-movement-y))] after:absolute after:bottom-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-[''] data-expanded:transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--offset-y)))] data-starting-style:transform-[translateY(-150%)] data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+150%))] data-expanded:data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+150%))] data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-150%))] data-expanded:data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-150%))] [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:transform-[translateY(-150%)]",
        bottom:
          "top-auto bottom-0 origin-bottom transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--peek))-(var(--shrink)*var(--height))))_scale(var(--scale))] [--offset-y:calc(var(--toast-offset-y)*-1+calc(var(--toast-index)*var(--gap)*-1)+var(--toast-swipe-movement-y))] after:absolute after:top-full after:left-0 after:h-[calc(var(--gap)+1px)] after:w-full after:content-[''] data-expanded:transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--offset-y)))] data-starting-style:transform-[translateY(150%)] data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+150%))] data-expanded:data-ending-style:data-[swipe-direction=down]:transform-[translateY(calc(var(--toast-swipe-movement-y)+150%))] data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-150%))] data-expanded:data-ending-style:data-[swipe-direction=up]:transform-[translateY(calc(var(--toast-swipe-movement-y)-150%))] [&[data-ending-style]:not([data-limited]):not([data-swipe-direction])]:transform-[translateY(150%)]",
      },
      horizontal: {
        left: 'right-auto left-0 mr-auto',
        center: 'right-0 left-0 mx-auto',
        right: 'right-0 left-auto ml-auto',
      },
    },
    defaultVariants: {
      vertical: 'bottom',
      horizontal: 'center',
    },
  },
);

const toastManager = ToastPrimitive.createToastManager();
let lastToastPosition: ToastPosition = defaultPosition;

function toast<Data extends object>(
  title: ReactNode,
  options?: ToastOptions<Data>,
) {
  if (options?.position) {
    lastToastPosition = options.position;
  }
  toastManager.add({
    title,
    ...options,
  });
}

toast.close = toastManager.close;
toast.update = toastManager.update;
toast.promise = toastManager.promise;

toast.success = <Data extends object>(
  title: ReactNode,
  options?: ToastOptions<Data>,
) => {
  toast(title, {...options, type: 'success'});
};
toast.info = <Data extends object>(
  title: ReactNode,
  options?: ToastOptions<Data>,
) => {
  toast(title, {...options, type: 'info'});
};
toast.warning = <Data extends object>(
  title: ReactNode,
  options?: ToastOptions<Data>,
) => {
  toast(title, {...options, type: 'warning'});
};
toast.error = <Data extends object>(
  title: ReactNode,
  options?: ToastOptions<Data>,
) => {
  toast(title, {...options, type: 'error'});
};

function Toaster() {
  return (
    <ToastPrimitive.Provider toastManager={toastManager}>
      <ToastsList />
    </ToastPrimitive.Provider>
  );
}

/**
 * A succinct message that is displayed temporarily.
 */
function Toast(props: ToastPrimitive.Root.Props) {
  return <ToastPrimitive.Root {...props} />;
}

function getToastPositionVariants(
  position: ToastPosition,
): ToastPositionVariantProps {
  const [vertical, horizontal] = position.split('-') as [
    ToastVerticalPosition,
    ToastHorizontalPosition,
  ];
  return {vertical, horizontal};
}

function ToastsList() {
  const {toasts} = ToastPrimitive.useToastManager();
  // always use position from the last globally opened toast. This will move all currently open toasts
  // to new postion, while preserving the same position when idividual toasts in the stack are closed.
  const positionVariants = getToastPositionVariants(lastToastPosition);

  return (
    <ToastPrimitive.Portal data-slot="toast-portal">
      <ToastPrimitive.Viewport
        className={cn(
          'group/toast-viewport',
          viewportVariants({position: lastToastPosition}),
        )}
      >
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            toast={toast}
            className={toastVariants(positionVariants)}
          >
            <ToastPrimitive.Content className="overflow-hidden transition-opacity duration-250 data-behind:pointer-events-none data-behind:opacity-0 data-expanded:pointer-events-auto data-expanded:opacity-100 [&_svg]:mt-0.5 [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4">
              <div className="flex items-start gap-2">
                {toast.type && <ToastIcon type={toast.type as ToastType} />}
                <ToastPrimitive.Title className="text-sm font-medium" />
                <ToastPrimitive.Close
                  render={
                    <Button
                      variant="default"
                      color="default"
                      size="icon-xs"
                      className="absolute top-[-6px] right-[-6px] hidden border bg-background shadow-sm group-hover/toast-viewport:flex"
                    />
                  }
                  aria-label="Close"
                >
                  <XIcon />
                </ToastPrimitive.Close>
              </div>
              <ToastPrimitive.Description className="text-sm text-muted-foreground" />
              {toast.actionProps && (
                <ToastPrimitive.Action
                  {...toast.actionProps}
                  render={
                    <Button
                      variant="outline"
                      color="default"
                      size="sm"
                      className="mt-2"
                    />
                  }
                />
              )}
            </ToastPrimitive.Content>
          </Toast>
        ))}
      </ToastPrimitive.Viewport>
    </ToastPrimitive.Portal>
  );
}

function ToastIcon({type}: {type: ToastType}) {
  switch (type) {
    case 'success':
      return <CircleCheckIcon className="text-positive" />;
    case 'info':
      return <InfoIcon className="text-primary" />;
    case 'warning':
      return <TriangleAlertIcon className="text-warning" />;
    case 'error':
      return <CircleAlertIcon className="text-destructive" />;
    case 'loading':
      return <Spinner className="size-4" />;
  }
}

export {toast, Toast, Toaster};

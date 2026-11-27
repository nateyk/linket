import {Dialog} from '@shadcn/dialog/dialog';
import {Button} from '@shadcn/button/button';
import {Trans} from '@ui/i18n/trans';
import type {ReactNode} from 'react';

export interface ProductPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

/**
 * A read-only, local preview of editor state. The passed buyer-facing
 * content must never expose private purchased file URLs or live checkout.
 */
export function ProductPreviewDialog({
  open,
  onOpenChange,
  children,
}: ProductPreviewDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop />
        <Dialog.Content className="gap-3 p-4 sm:max-w-lg sm:gap-4 sm:p-5">
          <Dialog.Header>
            <Dialog.Title>
              <Trans message="Customer preview" />
            </Dialog.Title>
            <Dialog.Description>
              <Trans message="Preview only. Buying and downloading are unavailable here." />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body className="-mx-4 max-h-[70dvh] min-h-0 overflow-y-auto px-4 sm:-mx-5 sm:px-5">
            {children}
          </Dialog.Body>
          <Dialog.Footer className="-mx-4 -mb-4 px-4 pb-4 sm:-mx-5 sm:-mb-5 sm:px-5 sm:pb-5">
            <Dialog.CloseButton render={<Button variant="outline" />}>
              <Trans message="Close" />
            </Dialog.CloseButton>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

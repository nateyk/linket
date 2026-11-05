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
        <Dialog.Content className="sm:max-w-2xl">
          <Dialog.Header>
            <Dialog.Title>
              <Trans message="Customer preview" />
            </Dialog.Title>
            <Dialog.Description>
              <Trans message="Preview only. Buying and downloading are unavailable here." />
            </Dialog.Description>
          </Dialog.Header>
          <Dialog.Body className="min-h-0 max-h-[70dvh] overflow-y-auto">
            {children}
          </Dialog.Body>
          <Dialog.Footer>
            <Dialog.CloseButton render={<Button variant="outline" />}>
              <Trans message="Close" />
            </Dialog.CloseButton>
          </Dialog.Footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

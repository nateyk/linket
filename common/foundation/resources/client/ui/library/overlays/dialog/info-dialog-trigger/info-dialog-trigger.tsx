import {IconButton} from '@ui/buttons/icon-button';
import {SvgIconProps} from '@ui/icons/svg-icon';
import {Dialog, DialogSize} from '@ui/overlays/dialog/dialog';
import {DialogBody} from '@ui/overlays/dialog/dialog-body';
import {DialogHeader} from '@ui/overlays/dialog/dialog-header';
import {DialogTrigger} from '@ui/overlays/dialog/dialog-trigger';
import clsx from 'clsx';
import {CircleQuestionMarkIcon} from 'lucide-react';
import {ReactElement, ReactNode} from 'react';

interface Props {
  title?: ReactNode;
  body: ReactNode;
  dialogSize?: DialogSize;
  className?: string;
  icon?: ReactElement<SvgIconProps>;
}
export function InfoDialogTrigger({
  title,
  body,
  dialogSize = 'xs',
  className,
  icon,
}: Props) {
  return (
    <DialogTrigger type="popover" triggerOnHover>
      <IconButton
        className={clsx('text-muted-foreground opacity-70', className)}
        iconSize="xs"
        size="2xs"
      >
        {icon || <CircleQuestionMarkIcon className="size-4" />}
      </IconButton>
      <Dialog size={dialogSize}>
        {title && (
          <DialogHeader padding="px-4.5 pt-4.5" hideDismissButton>
            {title}
          </DialogHeader>
        )}
        <DialogBody className={clsx(!title && 'text-center')}>
          {body}
        </DialogBody>
      </Dialog>
    </DialogTrigger>
  );
}

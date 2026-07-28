import clsx from 'clsx';
import {ReactNode} from 'react';
import {DialogSize} from './dialog';

export type DialogFooterProps = {
  children: ReactNode;
  startAction?: ReactNode;
  className?: string;
  dividerTop?: boolean;
  size?: DialogSize;
  padding?: string;
};
export function DialogFooter(props: DialogFooterProps) {
  const {children, startAction, className, dividerTop, padding, size} = props;

  return (
    <div
      className={clsx(
        className,
        dividerTop && 'border-t',
        getPadding(props),
        'flex flex-shrink-0 items-center gap-2.5',
      )}
    >
      <div>{startAction}</div>
      <div className="ml-auto flex items-center gap-2.5">{children}</div>
    </div>
  );
}

function getPadding({padding, size}: DialogFooterProps) {
  if (padding) {
    return padding;
  }
  switch (size) {
    case 'xs':
      return 'p-3.5';
    case 'sm':
      return 'p-4.5';
    default:
      return 'px-6 py-4';
  }
}

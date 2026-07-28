import clsx from 'clsx';
import { ReactNode } from 'react';

export interface IllustratedMessageProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md';
  image?: ReactNode;
  imageHeight?: string;
  imageMargin?: string;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}
export function IllustratedMessage({
  image,
  title,
  description,
  action,
  className,
  size = 'md',
  imageHeight,
  imageMargin = 'mb-6',
}: IllustratedMessageProps) {
  const style = getSizeClassName(size, imageHeight);
  return (
    <div
      className={clsx(
        'mx-auto w-max max-w-full text-center text-balance',
        className,
      )}
    >
      {image && (
        <div className={clsx('inline-block', style.image, imageMargin)}>
          {image}
        </div>
      )}
      {title && (
        <div className={clsx(style.title, 'mb-1 font-medium text-foreground')}>
          {title}
        </div>
      )}
      {description && (
        <div className={clsx(style.description, 'max-w-md text-sm text-muted-foreground')}>
          {description}
        </div>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

function getSizeClassName(
  size: IllustratedMessageProps['size'],
  imageHeight?: string,
) {
  switch (size) {
    case 'xs':
      return {
        image: imageHeight || 'h-15',
        title: 'text-sm',
        description: 'text-xs',
      };
    case 'sm':
      return {
        image: imageHeight || 'h-20',
        title: 'text-base',
        description: 'text-sm',
      };
    default:
      return {
        image: imageHeight || 'h-32',
        title: 'text-lg',
        description: 'text-base',
      };
  }
}

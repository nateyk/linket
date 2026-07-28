import clsx from 'clsx';
import {Children, cloneElement, ReactElement, ReactNode} from 'react';

interface TimelineProps {
  children?: ReactElement<TimelineProps>[];
  className?: string;
}
export function Timeline({children, className}: TimelineProps) {
  const items = Children.toArray(children);
  return (
    <div className={className}>
      {items.map((item, index) =>
        cloneElement(item as any, {
          isLast: index === items.length - 1,
        }),
      )}
    </div>
  );
}

interface TimelineItemProps {
  children: ReactNode;
  className?: string;
  isLast?: boolean;
  isActive?: boolean;
}
export function TimelineItem({
  children,
  className,
  isLast,
  isActive,
}: TimelineItemProps) {
  return (
    <div className={clsx('flex min-w-0 gap-3 py-1.5', className)}>
      <div>
        <div
          className={clsx(
            'mt-1 h-3 w-3 shrink-0 rounded-full border-[3px]',
            isActive && 'border-positive bg-positive/10',
          )}
        />
        {!isLast && (
          <div className="mx-auto mt-1 h-[calc(100%-12px)] w-0.5 bg-secondary"></div>
        )}
      </div>
      <div className="min-w-0 flex-auto overflow-hidden text-sm text-ellipsis whitespace-nowrap">
        {children}
      </div>
    </div>
  );
}

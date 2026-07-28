import clsx from 'clsx';
import React, { ReactNode, useId } from 'react';

export interface ListboxSectionProps {
  label?: ReactNode;
  children: React.ReactNode;
  index?: number;
}
export function Section({children, label, index}: ListboxSectionProps) {
  const id = useId();

  return (
    <div
      role="group"
      className={clsx(index !== 0 && 'my-1 border-t')}
      aria-labelledby={label ? `be-select-${id}` : undefined}
    >
      {label && (
        <div
          className="text-muted-foreground block px-4 py-2.5 text-xs uppercase"
          role="presentation"
          id={`be-select-${id}`}
          aria-hidden="true"
        >
          {label}
        </div>
      )}
      {children}
    </div>
  );
}

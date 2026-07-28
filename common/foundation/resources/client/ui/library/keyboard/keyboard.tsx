import { isMac } from '@react-aria/utils';
import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  modifier?: boolean;
  separator?: string;
}
export function Keyboard({children, modifier, separator = '+'}: Props) {
  const modKey = isMac() ? (
    <span className="align-middle text-base">⌘</span>
  ) : (
    'Ctrl'
  );
  return (
    <kbd className="text-muted-foreground text-xs">
      {modifier && (
        <>
          {modKey}
          {separator}
        </>
      )}
      {children}
    </kbd>
  );
}

import { Button } from 'react-email';
import type { ReactNode } from 'react';

interface LinketButtonProps {
  href: string;
  children: ReactNode;
  buttonBorderRadiusPx?: number;
  className?: string;
}

export function LinketButton({
  href,
  children,
  buttonBorderRadiusPx = 24,
  className = 'box-border bg-brand px-5 py-3 text-center text-sm font-medium text-white no-underline',
}: LinketButtonProps) {
  return (
    <Button
      href={href}
      className={className}
      style={{ borderRadius: buttonBorderRadiusPx }}
    >
      {children}
    </Button>
  );
}

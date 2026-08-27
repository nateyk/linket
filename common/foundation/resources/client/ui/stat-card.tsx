import {Card} from '@shadcn/card/card';
import {cn} from '@ui/utils/cn';
import {type ReactNode} from 'react';

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function StatCard({label, value, hint, icon, className}: StatCardProps) {
  return (
    <Card.Root className={cn('py-0', className)}>
      <Card.Header className="flex-row items-center justify-between gap-2 space-y-0 p-3">
        <Card.Description className="flex items-center gap-1.5 text-xs font-medium">
          {icon}
          {label}
        </Card.Description>
      </Card.Header>
      <Card.Content className="p-3 pt-0">
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </Card.Content>
    </Card.Root>
  );
}

import {Trans} from '@ui/i18n/trans';
import {CheckIcon, type LucideIcon} from 'lucide-react';
import type {ReactNode} from 'react';

interface OptionRowContentProps {
  icon: LucideIcon;
  title: string;
  description: string;
  hint?: ReactNode;
}

export function OptionRowContent({
  icon: Icon,
  title,
  description,
  hint,
}: OptionRowContentProps) {
  return (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-card-sm bg-muted text-muted-foreground ring-1 ring-foreground/5 peer-data-checked:bg-primary/10 peer-data-checked:text-primary peer-data-checked:ring-primary/15">
        <Icon />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold text-foreground">
          <Trans message={title} />
        </span>
        <span className="text-xs leading-relaxed font-normal text-muted-foreground">
          <Trans message={description} />
        </span>
        {hint && (
          <span className="text-xs leading-relaxed font-normal text-muted-foreground">
            {hint}
          </span>
        )}
      </span>
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background text-primary transition-colors peer-data-checked:border-primary peer-data-checked:bg-primary peer-data-checked:text-primary-foreground">
        <CheckIcon className="size-3 opacity-0 transition-opacity peer-data-checked:opacity-100" />
      </span>
    </>
  );
}

import {Trans} from '@ui/i18n/trans';
import {CheckIcon, type LucideIcon} from 'lucide-react';

interface OptionRowContentProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function OptionRowContent({
  icon: Icon,
  title,
  description,
}: OptionRowContentProps) {
  return (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-card-sm bg-muted text-muted-foreground ring-1 ring-foreground/5 group-data-pressed/type:bg-primary/10 group-data-pressed/type:text-primary group-data-pressed/type:ring-primary/15">
        <Icon />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-semibold text-foreground">
          <Trans message={title} />
        </span>
        <span className="text-xs leading-relaxed font-normal text-muted-foreground">
          <Trans message={description} />
        </span>
      </span>
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border bg-background text-primary transition-colors group-data-pressed/type:border-primary group-data-pressed/type:bg-primary group-data-pressed/type:text-primary-foreground">
        <CheckIcon className="size-3 opacity-0 transition-opacity group-data-pressed/type:opacity-100" />
      </span>
    </>
  );
}

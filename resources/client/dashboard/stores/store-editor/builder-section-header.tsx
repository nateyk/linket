import {useSectionLabelIds} from '@app/dashboard/stores/store-editor/section-accordion-trigger';
import {cn} from '@ui/utils/cn';
import type {LucideIcon} from 'lucide-react';
import type {ReactNode} from 'react';

interface BuilderSectionHeaderProps {
  icon: LucideIcon;
  title: ReactNode;
  description?: ReactNode;
  trailing?: ReactNode;
  isComplete?: boolean;
}

export function BuilderSectionHeader({
  icon: Icon,
  title,
  description,
  trailing,
  isComplete = false,
}: BuilderSectionHeaderProps) {
  const labelIds = useSectionLabelIds();

  return (
    <span className="flex min-w-0 flex-1 items-start gap-3 py-1">
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-card-sm bg-card',
          isComplete && 'bg-primary/10 text-primary',
          !isComplete && 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
        <span
          id={labelIds?.titleId}
          className="truncate text-sm leading-snug font-medium"
        >
          {title}
        </span>
        {description && (
          <span
            id={labelIds?.descriptionId}
            className="line-clamp-2 text-xs leading-snug font-normal text-muted-foreground"
          >
            {description}
          </span>
        )}
      </span>
      {trailing && <span className="mt-1 shrink-0">{trailing}</span>}
    </span>
  );
}

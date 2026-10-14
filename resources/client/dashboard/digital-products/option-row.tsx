import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import type {LucideIcon} from 'lucide-react';
import type {ReactNode} from 'react';

interface OptionRowContentProps {
  icon: LucideIcon;
  title: string;
  description: string;
  hint?: ReactNode;
  /**
   * T7: selection is rendered from React state, not from a `peer-data-checked`
   * CSS selector (the peer variant never matched a descendant of the sibling,
   * so the old check stayed at `opacity: 0`). Callers already know the
   * selection (`value === option.id`), so they pass it in and the icon tint
   * is painted here. The card's selection indicator is the real
   * RadioGroupItem the picker renders at the row's end — one visible
   * control, no drawn twin.
   */
  checked?: boolean;
}

export function OptionRowContent({
  icon: Icon,
  title,
  description,
  hint,
  checked = false,
}: OptionRowContentProps) {
  return (
    <>
      <span
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-card-sm bg-muted text-muted-foreground ring-1 ring-foreground/5',
          checked && 'bg-primary/10 text-primary ring-primary/15',
        )}
      >
        <Icon aria-hidden className="size-4.5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm leading-tight font-semibold text-foreground">
          <Trans message={title} />
        </span>
        {/* Description and format hint share one compact line: the hint is
            still its own element (a11y tests + screen readers read it as a
            separate token), but the card no longer needs a third row. */}
        <span className="flex flex-wrap items-center gap-x-1.5 text-xs leading-snug font-normal text-muted-foreground">
          <span>
            <Trans message={description} />
          </span>
          {hint && (
            <>
              <span aria-hidden="true" className="text-foreground/30">
                •
              </span>
              <span>{hint}</span>
            </>
          )}
        </span>
      </span>
    </>
  );
}

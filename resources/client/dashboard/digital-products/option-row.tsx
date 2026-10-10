import {Trans} from '@ui/i18n/trans';
import {cn} from '@ui/utils/cn';
import {CheckIcon, type LucideIcon} from 'lucide-react';
import type {ReactNode} from 'react';

interface OptionRowContentProps {
  icon: LucideIcon;
  title: string;
  description: string;
  hint?: ReactNode;
  /**
   * T7: selection is rendered from React state, not from a `peer-data-checked`
   * CSS selector. The glyph used to be a *descendant* of the peer radio's
   * sibling, so the peer variant never matched it and the check stayed at
   * `opacity: 0` — the selected card read the same as an unselected one.
   * Callers already know the selection (`value === option.id`), so they pass
   * it in and the glyph/tints are painted here.
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
          'flex size-10 shrink-0 items-center justify-center rounded-card-sm bg-muted text-muted-foreground ring-1 ring-foreground/5',
          checked && 'bg-primary/10 text-primary ring-primary/15',
        )}
      >
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
      {/* Selection indicator: filled primary circle + check on the selected
          card, empty circle otherwise. aria-hidden because the radio's
          accessible name comes from the label text, not from a decorative
          glyph. */}
      <span
        className={cn(
          'flex size-5 shrink-0 items-center justify-center rounded-full border bg-background transition-colors',
          checked
            ? 'border-primary bg-primary text-primary-foreground'
            : 'border-border text-primary',
        )}
      >
        {checked && (
          <CheckIcon aria-hidden data-selection-glyph className="size-3" />
        )}
      </span>
    </>
  );
}

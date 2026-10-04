import {cn} from '@ui/utils/cn';

/**
 * Character counter for single-line/multiline text fields, shown as "n/max".
 * Once the value reaches 90% of the limit it switches to the warning token so
 * users see the cap coming before the input stops accepting characters (A-18).
 */
export function CharacterCounter({
  current,
  max,
  className,
}: {
  current: number;
  max: number;
  className?: string;
}) {
  const isNearLimit = current >= Math.floor(max * 0.9);

  return (
    <span
      className={cn(
        'shrink-0 tabular-nums text-sm text-muted-foreground',
        isNearLimit && 'text-warning',
        className,
      )}
    >
      {current}/{max}
    </span>
  );
}

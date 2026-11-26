import {cn} from '@ui/utils/cn';
import {StarIcon} from 'lucide-react';

const starSizeClasses = {
  sm: 'size-4',
  md: 'size-5',
  lg: 'size-6',
} as const;

export interface RatingProps {
  /** Rating value between `0` and `max`. Supports fractional values (e.g. `4.6`). */
  rating: number;
  /** Maximum number of stars. Defaults to `5`. */
  max?: number;
  /** Star icon size preset. */
  size?: keyof typeof starSizeClasses;
  /** Optional class override for individual star icons. */
  starClassName?: string;
  className?: string;
}

/**
 * Token-driven fractional star rating display using `@ui` warning color.
 */
export function Rating({
  rating,
  max = 5,
  size = 'sm',
  starClassName,
  className,
}: RatingProps) {
  const clamped = Math.min(max, Math.max(0, Number.isFinite(rating) ? rating : 0));
  const sizeClass = starSizeClasses[size];

  return (
    <div
      data-slot="rating"
      className={cn('inline-flex items-center gap-0.5', className)}
      role="img"
      aria-label={`${Number.isInteger(clamped) ? clamped : clamped.toFixed(1)} / ${max}`}
    >
      {Array.from({length: max}, (_, index) => {
        const fill = Math.min(1, Math.max(0, clamped - index));
        return (
          <span
            key={index}
            className={cn('relative inline-flex shrink-0', sizeClass, starClassName)}
            aria-hidden="true"
          >
            <StarIcon
              className={cn(
                sizeClass,
                'shrink-0 fill-current text-[var(--biolink-muted-text,var(--color-muted-foreground))]/25 stroke-none',
                starClassName,
              )}
            />
            {fill > 0 && (
              <span
                className="absolute inset-y-0 start-0 overflow-hidden"
                style={{width: `${fill * 100}%`}}
              >
                <StarIcon
                  className={cn(
                    sizeClass,
                    'shrink-0 fill-current text-warning stroke-none',
                    starClassName,
                  )}
                />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export default Rating;

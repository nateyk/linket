import {StarIcon} from 'lucide-react';
import {cn} from '@ui/utils/cn';

/**
 * Five star row used by the product summary and the reviews block.
 * Filled stars use the warning status token so the rating stays a token-driven
 * state color under every theme preset.
 */
export function RatingStars({
  value,
  className,
  starClassName,
}: {
  value: number;
  className?: string;
  starClassName?: string;
}) {
  return (
    <div
      className={cn('flex items-center gap-0.5', className)}
      role="img"
      aria-label={`${value} / 5`}
    >
      {[1, 2, 3, 4, 5].map(star => (
        <StarIcon
          key={star}
          className={cn(
            'size-4 shrink-0',
            star <= value
              ? 'fill-current text-warning'
              : 'text-[var(--biolink-muted-text)]',
            starClassName,
          )}
        />
      ))}
    </div>
  );
}

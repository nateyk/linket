import {Rating} from '@shadcn/rating';

/**
 * Five star row used by the product summary and the reviews block.
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
    <Rating
      rating={value}
      className={className}
      starClassName={starClassName}
    />
  );
}
